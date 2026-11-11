# WebBlocker — Windows 网站屏蔽工具

一个在 Windows 上运行的图形化小工具：把网站加入列表后，即可在浏览器里禁止访问这些网站。

它有两层拦截方式：

1. **hosts 屏蔽**：系统级，Chrome、Edge、Firefox、Opera、Brave 以及桌面客户端全部生效；
2. **配套浏览器扩展**：自动同步主程序的网站列表，按域名拦截，**该域名的所有子域名一并屏蔽**（`vip.`、`api.`、`m.`……），且不受浏览器 DoH 影响。

```
webblocker/
├─ webblocker.py          主程序（单文件，仅用 Python 标准库）
├─ extension/             Chrome / Edge 扩展（自动同步规则）
│  ├─ manifest.json
│  ├─ background.js
│  ├─ popup.html
│  ├─ popup.js
│  └─ icons/
├─ run.bat                双击启动（自动寻找 Python）
├─ build_exe.bat          一键打包成 WebBlocker.exe
└─ README.md              本说明
```

## 功能

- 添加 / 批量添加网站，自动识别整条网址（如 `https://www.example.com/page` → `example.com`）
- 配套扩展**自动同步**主程序列表，无需复制粘贴，覆盖所有子域名
- 一键开启 / 关闭屏蔽，列表和开关状态自动保存
- hosts 同时覆盖主域名以及 `www.`、`m.` 子域名，并写入 IPv4 + IPv6 记录
- 修改 hosts 前自动备份，采用“标记区块”方式写入，不会破坏 hosts 里原有内容
- 每次修改后自动刷新 DNS 缓存，立即生效
- 支持中文域名（自动转 punycode）
- 可导出 uBlock Origin / AdGuard 规则，作为扩展之外的备选方案

## 快速开始

### 方式一：直接用源码运行（推荐，最简单）

1. 安装 [Python 3.8+](https://www.python.org/downloads/windows/)，安装时勾选 **Add python.exe to PATH**。
2. 把本文件夹复制到 Windows 电脑上，双击 `run.bat`。
3. 程序会弹出 UAC 提示，点击“是”授予管理员权限（修改 hosts 必需）。
4. 输入网站 → 点“添加”，即可屏蔽。

也可以右键 `webblocker.py` → “以管理员身份运行” / 在命令行执行：

```bat
python webblocker.py
```

### 方式二：打包成独立的 exe（给别人用、无需装 Python）

在 Windows 上双击 `build_exe.bat`，脚本会自动安装 PyInstaller 并生成：

```
dist\WebBlocker.exe
```

这个 exe 是单文件、无控制台窗口，并内置了“需要管理员权限”的清单，双击即自动提权。`extension/` 文件夹会被一起打包进去，程序里的“安装扩展…”仍然可用。

> 如果第一次运行被 SmartScreen 拦截，点“更多信息 → 仍要运行”即可。PyInstaller 打包的程序偶尔会被杀毒软件误报。

## 使用步骤

1. 在输入框填写网站，例如 `example.com`，回车或点“添加”。
   - 可粘贴完整网址，程序会自动提取域名。
   - 支持一次添加多个：用逗号、空格或分号分隔，如 `bilibili.com, douyin.com`。
2. 列表中的网站会立即被屏蔽（状态显示“屏蔽生效中”）。
3. 选中条目点“移除选中”，或点“清空列表”取消屏蔽。
4. 点“关闭屏蔽”可暂停 hosts 屏蔽；网站列表会保留，随时可以再开启。

## 浏览器扩展（推荐：自动同步、覆盖所有子域名）

### 安装一次即可

1. 保持主程序正在运行，点程序右下角的 **“安装扩展…”**（菜单“文件”里也有）。
   程序会把扩展释放到 `%APPDATA%\WebBlocker\extension` 并自动打开该文件夹。
2. 在 Chrome 地址栏打开 `chrome://extensions`（Edge 为 `edge://extensions`）。
3. 打开右上角的 **“开发者模式”**。
4. 点 **“加载已解压的扩展程序”**，选择刚才打开的 `extension` 文件夹。
5. 点浏览器工具栏上的 WebBlocker 图标，可以看到同步状态。

扩展加载后会一直保留，重启浏览器不需要重新安装。Chrome 有时会在启动时提示“停用开发者模式扩展”，选择保留/取消即可。

### 自动同步是怎么工作的

- 主程序启动时会在 **127.0.0.1** 上开一个只读接口，端口范围 `8765–8774`（只监听本机回环地址，不对局域网开放）。
- 扩展每 30 秒检查一次，也会在浏览器启动、扩展安装、打开扩展弹窗时立即同步。
- 主程序里新增 / 删除网站后，最多约 30 秒扩展规则自动更新；打开扩展弹窗点“立即同步”可以马上刷新。
- 规则保存在浏览器扩展自己的存储里，**主程序关闭后仍然继续生效**；只是主程序关闭期间无法接收新改动。
- 扩展使用 Chrome 的 `declarativeNetRequest` 按 `requestDomains` 拦截，主域名和所有子域名一起生效。

### 主程序里的开关

- **浏览器扩展拦截（自动同步）**：勾选时把列表同步给扩展；取消勾选会清空扩展规则。
- 它与“开启 / 关闭屏蔽”（hosts）相互独立：
  - 两个都开：系统级 + 浏览器全子域名，效果最强。
  - 只勾扩展、关闭 hosts：只在安装了扩展的浏览器里生效，不影响桌面客户端。
  - 只开 hosts、不勾扩展：仅系统级，覆盖主域名 + `www` + `m`。

### 适用范围

- 扩展支持 **Chrome、Edge 等 Chromium 内核浏览器**（要求 Chrome 101+）。
- 不支持 Firefox（Firefox 的 MV3 后台机制与 Chrome 不同），Firefox 可继续使用 hosts 或下面的 uBlock 方案。
- 扩展是“已解压”形式，没有上架商店，所以需要开启开发者模式加载；这是正常现象。

## 备选：uBlock Origin / AdGuard 规则

如果不想加载已解压扩展，也可以点“导出浏览器规则”，程序会生成规则文件并复制到剪贴板：

```
||example.com^
```

使用方法：

1. 安装支持自定义规则的扩展：**uBlock Origin**（Firefox 完整版）或 **AdGuard**。
   - Chrome / Edge 请确认扩展支持“我的过滤器 / 用户规则”；
     商店里的 **uBlock Origin Lite 不支持自定义规则**。
2. 打开扩展仪表板 → “我的过滤器 / 用户规则” → 粘贴 → 应用更改。
3. 刷新网页即可。规则文件位于 `%APPDATA%\WebBlocker\browser-rules.txt`。

注意：这种方式不会自动同步，网站列表变化后需要重新导出并覆盖粘贴。

## hosts 屏蔽说明

程序把域名写入：

```
C:\Windows\System32\drivers\etc\hosts
```

在文件中维护一段带标记的区块：

```
# >>> WebBlocker managed block - do not edit below >>>
0.0.0.0    example.com
0.0.0.0    www.example.com
0.0.0.0    m.example.com
::1        example.com
...
# <<< WebBlocker managed block <<<
```

浏览器访问这些域名时会被解析到 `0.0.0.0` / `::1`，连接失败，从而达到屏蔽效果。这部分对所有浏览器和大部分联网程序都有效。

## 注意事项与限制

- **需要管理员权限**：hosts 文件受系统保护，普通权限无法修改。
- **hosts 不支持通配符**：无法用 `*.example.com` 一次屏蔽所有子域名。默认覆盖主域名、`www.` 和 `m.`；其它子域名请使用浏览器扩展。
- **浏览器“安全 DNS / DNS over HTTPS”会绕过 hosts**：
  - Chrome / Edge：设置 → 隐私和安全 → 安全 → 关闭“使用安全 DNS”。
  - Firefox：设置 → 隐私与安全 → 关闭“启用基于 HTTPS 的 DNS”。
  - 浏览器扩展方式不受 DoH 影响。
- **生效时间**：程序会自动执行 `ipconfig /flushdns`。如果仍能访问，请完全退出并重启浏览器（浏览器自身也有 DNS 缓存），必要时清理浏览器缓存。
- hosts 屏蔽是系统级的，相关网站的桌面客户端、更新程序等也会一并无法连接。
- 扩展同步接口只绑定 `127.0.0.1`，且只提供只读的网站列表；但仍建议不要把陌生程序加入信任列表。
- 本工具适合自我约束、减少干扰，**不是**无法绕过的家长控制/安全产品：拥有管理员权限的人可以随时修改 hosts、停用扩展或关闭本程序。
- 请只屏蔽自己有权管理的设备；不要用它做恶意拦截。

## 数据与卸载

- 网站列表与开关状态：`%APPDATA%\WebBlocker\config.json`
- hosts 修改前备份：`%APPDATA%\WebBlocker\hosts.backup`
- 导出的浏览器规则：`%APPDATA%\WebBlocker\browser-rules.txt`
- 释放的扩展文件：`%APPDATA%\WebBlocker\extension`

完全卸载：

1. 打开程序，点“关闭屏蔽”（或手动删除 hosts 中的 WebBlocker 标记区块）；
2. 在 `chrome://extensions` / `edge://extensions` 里移除 WebBlocker 扩展；
3. 删除 `%APPDATA%\WebBlocker` 文件夹；
4. 删除程序文件即可。

程序只会在 hosts 中增加自己的标记区块，关闭屏蔽时会完整移除该区块，不影响 hosts 里其它自定义记录。

## 常见问题

**扩展显示“主程序未运行”？**
打开 WebBlocker 主程序即可，扩展会在 30 秒内自动连上；也可以点扩展弹窗里的“立即同步”。

**主程序开着，扩展仍不同步？**
检查主程序日志中“扩展同步接口已启动”的端口；如果提示端口被占用，关闭占用 8765–8774 的程序后重启 WebBlocker。再确认主程序里“浏览器扩展拦截”是勾选状态。

**添加后仍能打开网站？**
按顺序检查：是否访问的是其它子域名（用扩展）→ 浏览器是否开启了安全 DNS（影响 hosts）→ 是否重启了浏览器 → 执行 `ipconfig /flushdns`。

**提示“没有权限修改 hosts 文件”？**
请以管理员身份运行。使用 `run.bat` 或打包后的 exe 时，程序会自动弹出 UAC 提权窗口。

**修改 hosts 会被杀毒软件拦截？**
部分安全软件会保护 hosts 文件。请暂时允许本程序，或把程序加入白名单。

**能否只屏蔽某个浏览器？**
可以：点“关闭屏蔽”移除 hosts 规则，保持“浏览器扩展拦截”勾选，并且只在该浏览器安装扩展。其它浏览器不受影响。

**扩展会不会上传数据？**
不会。扩展只访问 `127.0.0.1` 上的本机主程序，不连接任何外部服务器。
