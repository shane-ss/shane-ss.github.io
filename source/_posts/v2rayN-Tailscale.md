---
title: 让 Tailscale 绕开 v2rayN 的 TUN：解决 P2P 直连失败
tags:
  - Tailscale
  - v2rayN
  - sing-box
  - 网络
date: 2026-10-31 17:20:00
---

# 问题

Windows 上同时开着 v2rayN 的 TUN 模式（sing-box 核心）和 Tailscale，Tailscale 的 P2P 连接不稳定。

# 现象

- `tailscale status` 显示路径在 `direct` 和 `relay` 之间来回跳，ping 虚拟机大量丢包。
- `tailscale netcheck` 显示的公网 IP 不是本机宽带的，最近的 DERP 在国外，各节点延迟也几乎一样。
- `ping -6` 任何地址都报 `General failure`。

# 解决

**1. 让 Tailscale 的 UDP 直连**

在「设置 → 路由设置」里打开当前规则集，从剪贴板导入下面的规则（不要替换原有规则），然后置顶：

```json
[
  {
    "remarks": "Tailscale UDP direct",
    "outboundTag": "direct",
    "network": "udp",
    "process": ["tailscaled.exe", "tailscale.exe"],
    "enabled": true
  }
]
```

**2. 添加系统代理例外**

在「设置 → 参数设置 → 系统代理设置」的例外列表末尾加上：

```text
;100.*
```

**3. 关闭严格路由**

在「设置 → 参数设置 → TUN 模式设置」里关闭严格路由（Strict Route），然后重启服务。

关闭后 DNS 泄漏的风险会略微上升。

# 验证

```bash
tailscale ping <对端设备名>
```

看到 `via <IP>:<端口>` 就是直连，`via DERP` 则是中继。我这边修复后是 IPv6 直连，到虚拟机的 ping 30 个全通。
