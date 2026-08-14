# Mahjong 專案完成總結
## 索引
- [核心架構概念](#核心架構概念)
  - [1 遊戲啟動與進入遊戲](#1-遊戲啟動與進入遊戲)
  - [2 Server Notify 解析方式](#2-server-notify-解析方式)
  - [3 Notify 對應演出狀態](#3-notify-對應演出狀態)
- [Notify 類型與責任（摘要）](#notify-類型與責任摘要)
- [架構圖網址（Miro）](#架構圖網址miro)
- [工具整合：Excel 表格](#工具整合excel-表格)
- [已表格化的資料模組](#已表格化的資料模組)
- [未來優化](#未來優化)

## 核心架構概念
 
### 1 遊戲啟動與進入遊戲
- 遊戲啟動入口
  - Cocos v3.8.3
  - \assets\Start\Controller\main.ts
  - start.scene
- 遊戲 Config 設定
  - ```json
 
- **MahjongLanguageTable(未完成)**
  - 用途：多語系字串（UI 文案、牌型名稱、系統提示等）
  - 效益：可快速新增語言/改文案，避免散落在程式中
  - 路徑：assets\Json\MahjongLanguageTable
 
- **MahjongFanTable**
  - 用途：番型定義、番數/台數、判定條件描述、顯示排序等、是否顯示大獎(未完成)
  - 效益：番型擴充與數值調整不用改邏輯層（僅需補表與對應 key）
  - 路徑：assets\Json\MahjongFanTable
 
- **MahjongErrorTable**
  - 用途：錯誤碼 → 顯示標題/內容（可配合 i18n）
  - 效益：Server error code 對應顯示統一管理，避免 UI 到處寫 switch-case
  - 路徑：assets\Json\MahjongErrorTable
 
- **VoicePath、VoiceName**
  - 用途：依照語音人物不同進行分類，用以檢索不同人物與區分不同性別，對應不同語音音量
  - 效益：音訊資源統一管理、方便替換與調整，避免硬綁檔名與路徑
  - 路徑：assets\Audio\table\VoicePath & assets\Audio\table\VoiceName

- **SystemVoice**
  - 用途：整理系統語音撥放路徑與相對應的音量
  - 效益：音訊資源統一管理、方便替換與調整
  - 路徑：assets\Audio\table\SystemVoice

- **EffectAudio**
  - 用途：整理音效撥放路徑與相對應的音量，吃碰槓相關音效id用以對應程式enum參數
  - 效益：音訊資源統一管理、方便替換與調整
  - 路徑：assets\Audio\table\EffectAudio

- **BGMAudio**
  - 用途：整理背景音樂撥放路徑與相對應的音量，路徑以陣列的方式實現BGM隨機選取功能
  - 效益：音訊資源統一管理、方便替換與調整
  - 路徑：assets\Audio\table\BGMAudio


## 未來優化
  **未來優化.md**
  - [Mahjong未來優化](未來優化.md)
  
=======
# Training.cocos



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

* [Create](https://docs.gitlab.com/user/project/repository/web_editor/#create-a-file) or [upload](https://docs.gitlab.com/user/project/repository/web_editor/#upload-a-file) files
* [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin http://git.tp.wanin.tw/Claire/training.cocos.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

* [Set up project integrations](http://git.tp.wanin.tw/Claire/training.cocos/-/settings/integrations)

## Collaborate with your team

* [Invite team members and collaborators](https://docs.gitlab.com/user/project/members/)
* [Create a new merge request](https://docs.gitlab.com/user/project/merge_requests/creating_merge_requests/)
* [Automatically close issues from merge requests](https://docs.gitlab.com/user/project/issues/managing_issues/#closing-issues-automatically)
* [Enable merge request approvals](https://docs.gitlab.com/user/project/merge_requests/approvals/)
* [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

* [Get started with GitLab CI/CD](https://docs.gitlab.com/ci/quick_start/)
* [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/user/application_security/sast/)
* [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/topics/autodevops/requirements/)
* [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/user/clusters/agent/)
* [Set up protected environments](https://docs.gitlab.com/ci/environments/protected_environments/)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
>>>>>>> e0726829e90b91e6ab24ff1cc4fe3f44a27cb79a
