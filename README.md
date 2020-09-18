[Yahoo!ニュースの元記事を探す](https://github.com/furyutei/YN-SearchOrigin)
===

- License: The MIT license  
- Copyright (c) 2020 風柳(furyu)  
- 対象ブラウザ： Google Chrome（[Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)が必要）、Firefox（[Tampermonkey](https://addons.mozilla.org/ja/firefox/addon/tampermonkey/)が必要）

[Yahoo!ニュース](https://news.yahoo.co.jp/)上の記事の、元となった記事を探そうと試みます。  


■ これはなに？
---
[Yahoo!ニュース](https://news.yahoo.co.jp/) の記事では、元となった記事へのリンクが掲示されていないため、これを探そうと試みます。  


■ インストール方法
---
[Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=ja)を入れたGoogle Chrome、もしくは、[Tampermonkey](https://addons.mozilla.org/ja/firefox/addon/tampermonkey/)を入れたFirefoxにて、  

> [YN-SearchOrigin.user.js](https://github.com/furyutei/YN-SearchOrigin/raw/master/src/js/YN-SearchOrigin.user.js)  

をクリックし、指示に従ってインストール。  

■ 使い方
---
[Yahoo!ニュース](https://news.yahoo.co.jp/)の Path が /pickup/* もしくは /articles/* となっている記事では[元記事検索]リンクが表示されるようになります。  
これをクリックすると別タブが開き、元記事らしきものが判別できた場合にはその記事へ、そうでない場合は Google 検索ページへと遷移します。  

■ 関連
---
- [Yahoo News Original Finder](https://greasyfork.org/ja/scripts/403843-yahoo-news-original-finder)
  [既に同様のユーザースクリプトを公開されている方がいらっしゃいました](https://twitter.com/furyutei/status/1306761164764770304)  （[かんたんきかく @kantankikaku](https://twitter.com/kantankikaku) ／[のあ @knoa](https://twitter.com/knoa)様）。こちらはクリック不要で、自動的に元記事へと遷移してくれるようです。  
