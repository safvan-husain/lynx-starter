use futures_util::{SinkExt, StreamExt};
use std::net::SocketAddr;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::Message;

#[tokio::main]
async fn main() {
    let addr: SocketAddr = "0.0.0.0:8080".parse().unwrap();
    let listener = TcpListener::bind(&addr).await.expect("Failed to bind");
    println!("WebSocket echo server listening on {}", addr);

    while let Ok((stream, peer)) = listener.accept().await {
        tokio::spawn(handle_connection(stream, peer));
    }
}

async fn handle_connection(stream: TcpStream, peer: SocketAddr) {
    let ws_stream = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("WebSocket handshake failed for {}: {}", peer, e);
            return;
        }
    };
    println!("New WebSocket connection: {}", peer);

    let (mut write, mut read) = ws_stream.split();

    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                println!("[{}] Received: {}", peer, text);
                if let Err(e) = write.send(Message::Text(text)).await {
                    eprintln!("[{}] Send error: {}", peer, e);
                    break;
                }
            }
            Ok(Message::Close(_)) => {
                println!("[{}] Connection closed", peer);
                break;
            }
            Ok(_) => {} // ignore binary, ping, pong
            Err(e) => {
                eprintln!("[{}] Error: {}", peer, e);
                break;
            }
        }
    }

    println!("[{}] Disconnected", peer);
}
