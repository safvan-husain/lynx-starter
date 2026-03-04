//
//  ContentView.swift
//  lynx-ios
//
//  Created by SAFVAN HUSAIN on 03/03/26.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        LynxHostControllerView()
            .ignoresSafeArea()
    }
}

struct LynxHostControllerView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        LynxHostViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}

#Preview {
    ContentView()
}
