<div align="center">
  <h1>STELE 到访记录</h1>
  <p>记录你在 <a href="http://stele.geogv.org/zhcn/">STELE 中国遗产地图</a>上走过的地方。</p>
  <p><a href="README.md">English</a> · <strong>中文</strong></p>
  <p><a href="#安装">安装</a> · <a href="#使用">使用</a> · <a href="#备份与更新">备份与更新</a></p>
</div>

---

## 关于

STELE 到访记录是一个 Chrome 扩展，可以保存到访过的地点，并按文物保护级别查看统计。

- 标记到访地点，添加日期和备注。
- 查看世界遗产，以及国家、省、市、县级文保单位的统计。
- 将记录导出为 CSV，或备份为 JSON。

子项目在到访列表中单独显示。如果 STELE 提供了相同的文保编号或所属项目，相关地点会在对应级别的统计中合并为一项。到访总数仍按保存的地点计算。缺少编号时，可以在扩展中补充。

## 安装

1. 下载并解压这个仓库。
2. 在 Chrome 中打开 `chrome://extensions`，开启**开发者模式**。
3. 点击**加载已解压的扩展程序**，选择包含 `manifest.json` 的文件夹。
4. 打开或刷新 [STELE](http://stele.geogv.org/zhcn/)。

## 使用

在地图上打开一个地点，点击**标记为已到访**。点击浏览器中的扩展图标，即可查看记录和统计。打开记录中的**编辑 / Edit**可以修改详细信息。

## 备份与更新

记录保存在当前 Chrome 配置文件中。点击**备份 JSON**保存备份，点击**导入备份**恢复记录。移除扩展会删除记录，请先备份。

更新时，将新文件替换到原来的文件夹，在 `chrome://extensions` 点击扩展的**重新加载**，再刷新 STELE，记录就会保留。

---

本项目与 STELE 及其开发者无隶属关系。README 排版参考 [Best-README-Template](https://github.com/othneildrew/Best-README-Template)。
