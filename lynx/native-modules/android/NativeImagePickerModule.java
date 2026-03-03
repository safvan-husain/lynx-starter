package com.lynx.explorer.modules;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.tasm.behavior.LynxContext;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class NativeImagePickerModule extends LynxModule {
  private static final int REQUEST_CODE_PICK_IMAGE = 20311;
  private static Callback pendingCallback;

  public NativeImagePickerModule(Context context) {
    super(context);
  }

  private Activity getActivity() {
    LynxContext lynxContext = (LynxContext) mContext;
    Context context = lynxContext.getContext();
    if (context instanceof Activity) {
      return (Activity) context;
    }
    return null;
  }

  @LynxMethod
  public void pickImageFromFileManager(Callback callback) {
    Activity activity = getActivity();
    if (activity == null) {
      callback.invoke(null, "Host activity is unavailable.");
      return;
    }

    if (pendingCallback != null) {
      callback.invoke(null, "Another image picker request is already in progress.");
      return;
    }

    pendingCallback = callback;

    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("image/*");
    activity.startActivityForResult(intent, REQUEST_CODE_PICK_IMAGE);
  }

  public static boolean onActivityResult(
      int requestCode,
      int resultCode,
      Intent data,
      Context context
  ) {
    if (requestCode != REQUEST_CODE_PICK_IMAGE || pendingCallback == null) {
      return false;
    }

    Callback callback = pendingCallback;
    pendingCallback = null;

    if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
      callback.invoke(null, "Image selection was canceled.");
      return true;
    }

    Uri uri = data.getData();
    try {
      String dataUrl = toDataUrl(context, uri);
      callback.invoke(dataUrl, null);
    } catch (Exception exception) {
      callback.invoke(null, "Failed to read selected image: " + exception.getMessage());
    }

    return true;
  }

  private static String toDataUrl(Context context, Uri uri) throws IOException {
    InputStream inputStream = context.getContentResolver().openInputStream(uri);
    if (inputStream == null) {
      throw new IOException("Cannot open selected image URI.");
    }

    byte[] imageBytes;
    try {
      imageBytes = readAllBytes(inputStream);
    } finally {
      inputStream.close();
    }

    String mimeType = context.getContentResolver().getType(uri);
    if (mimeType == null || mimeType.isEmpty()) {
      mimeType = "image/jpeg";
    }

    String base64 = Base64.encodeToString(imageBytes, Base64.NO_WRAP);
    return "data:" + mimeType + ";base64," + base64;
  }

  private static byte[] readAllBytes(InputStream inputStream) throws IOException {
    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    byte[] buffer = new byte[8192];
    int bytesRead;
    while ((bytesRead = inputStream.read(buffer)) != -1) {
      outputStream.write(buffer, 0, bytesRead);
    }
    return outputStream.toByteArray();
  }
}
