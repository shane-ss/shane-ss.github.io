---
title: 用 USB/IP 在两台 Windows 之间共享 USB 设备
tags:
  - USB/IP
  - usbipd
  - Windows
  - 网络
date: 2026-10-31 18:00:00
---

# 问题

用 VirtualHere 共享 USB 设备时，客户端报错：

```text
When running the Client as a Service you can only connect to purchased servers
```

客户端以服务模式运行时，只能连接已购买授权的服务器。而且未授权的服务器同时只能共享一个设备，所以我换成了开源免费的 USB/IP。

- 服务端（接 USB 设备的电脑）：`usbipd-win`
- 客户端（使用设备的电脑）：`usbip-win2`

下面的命令都在管理员终端里运行。

# 安装服务端

```bash
winget install usbipd
```

如果装错了电脑，先取消所有共享，再卸载：

```bash
usbipd unbind --all
winget uninstall usbipd
```

# 共享设备

查看设备的 BUSID：

```bash
usbipd list
```

```text
BUSID  VID:PID    DEVICE                    STATE
3-1    1a86:7523  USB-SERIAL CH340 (COM4)   Not shared
3-3    0483:3748  STM32 STLink              Not shared
```

共享需要的设备，这里以 CH340 为例：

```bash
usbipd bind --busid 3-1
```

状态变成 `Shared` 就可以了。这个设置重启后依然保留，所以每个设备只需操作一次。

# 放行端口

USB/IP 使用 TCP 3240 端口。客户端连不上时，在服务端的 CMD 中添加防火墙规则：

```bash
netsh advfirewall firewall add rule name="usbipd TCP 3240" dir=in action=allow protocol=TCP localport=3240 profile=any
```

确认服务正在运行，端口也在监听：

```bash
sc query usbipd
netstat -ano | findstr :3240
```

然后在客户端的 PowerShell 中测试，看到 `TcpTestSucceeded : True` 就说明端口通了：

```powershell
Test-NetConnection <服务端IP> -Port 3240
```

如果还是不通，可以再检查这几项：

- 第三方安全软件的防火墙是否拦截了 3240 端口。
- IP 是否为两台电脑实际互通的网卡地址，而不是虚拟网卡的地址。
- 两台电脑是否在同一网段，VPN 或路由器的 AP 隔离也可能阻止互访。

# 安装客户端

从 [usbip-win2 Releases](https://github.com/vadimgrn/usbip-win2/releases) 下载并安装。它带图形界面，也可以用命令行。

查看服务端共享的设备：

```bash
usbip list -r <服务端IP>
```

连接设备：

```bash
usbip attach -r <服务端IP> -b 3-1
```

# 验证

- 服务端运行 `usbipd list`，设备状态变为 `Attached`。
- 客户端设备管理器的「端口」下出现 CH340，COM 编号可能和服务端不同。

如果显示未知设备，在客户端安装对应的驱动，这里是 CH340 驱动。

# 备注

**`hrdevmon` 警告**

运行 `usbipd` 时可能看到这条警告：

```text
usbipd: warning: Unknown USB filter 'hrdevmon' may be incompatible with this software; 'bind --force' may be required.
```

这是第三方 USB 过滤驱动触发的提示，只是可能不兼容。设备能正常连接就不用管。如果 `list` 能看到设备，但连接失败或连接后不能用，再强制共享：

```bash
usbipd bind --force --busid 3-1
```

强制共享后，即使没有客户端连接，服务端本机也可能无法使用这个设备。恢复本机使用：

```bash
usbipd unbind --busid 3-1
```

**图形界面**

`usbipd-win` 官方没有图形界面，不过服务端基本只需配置一次，用命令行就够了。日常连接和断开都在客户端操作。
