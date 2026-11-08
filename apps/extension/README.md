# Lumen Product Importer (Chrome extension)

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, choose this `apps/extension` folder.
2. Click the extension's **Details > Extension options**. Enter your store URL and an import key (Admin > Import products > New import key).
3. Open any product page on Temu, Alibaba or AliExpress, wait for it to load fully (scroll once), click the extension icon, then **Send to store**.
4. Click **Review and import**, choose images, price and category, and import.

Marketplaces change their pages from time to time. All reading logic is in `extract.js`.
