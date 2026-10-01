【Render公開用】16模様カード当てゲーム

GitHubにアップロードするときは、このZIPの中身をそのままリポジトリの一番上に置いてください。
「16模様カード当てゲーム_オンライン完成版」というフォルダ自体をアップロードしないでください。

正しい構成：
package.json
server.js
render.yaml
README.md
README_RENDER.txt
public/
  index.html

Render設定：
Build Command: npm install
Start Command: npm start
Plan: Free

注意：
・Node.js + WebSocketを使用します。
・ルーム情報はサーバーのメモリ上に保存されます。
・サーバーが再起動すると作成中のルームは消えます。
