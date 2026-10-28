<div align="center">
  <h1>STELE Visit Tracker</h1>
  <p>Keep track of the places you've visited on <a href="http://stele.geogv.org/zhcn/">STELE 中国遗产地图</a>.</p>
  <p><strong>English</strong> · <a href="README.zh-CN.md">中文</a></p>
  <p><a href="#installation">Install</a> · <a href="#usage">How to use</a> · <a href="#backups-and-updates">Backups</a></p>
</div>

---

## About

STELE Visit Tracker is a Chrome extension for saving places you have visited and seeing your progress by heritage level.

- Mark places as visited and add dates or notes.
- See counts for World Heritage and national, provincial, city, and county listings.
- Export your list as CSV or back it up as JSON.

Sub-items stay separate in your visit list. When STELE provides a matching listing number or parent, they count as one listing in the relevant category. The total counts each saved place. You can edit missing numbers in the extension.

## Installation

1. Download and unzip this repository.
2. Open `chrome://extensions` in Chrome and turn on **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.
4. Open or refresh [STELE](http://stele.geogv.org/zhcn/).

## Usage

Open a place on the map and click **标记为已到访** to save it. Click the extension icon to see your list and counts. Open **编辑 / Edit** on a record to change its details.

## Backups and updates

Records are stored in your Chrome profile. Use **备份 JSON** to save a backup and **导入备份** to restore it. Removing the extension deletes its records, so back them up first.

To update the extension, replace the files in the same folder, click **Reload** on `chrome://extensions`, then refresh STELE. Your records will stay in place.

---

This project is independent of STELE and its developer. README layout adapted from [Best-README-Template](https://github.com/othneildrew/Best-README-Template).
