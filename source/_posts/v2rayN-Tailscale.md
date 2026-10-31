---
title: 让 Tailscale 绕开 v2rayN 的 TUN：解决 P2P 直连失败
tags:
  - Tailscale
  - v2rayN
  - sing-box
  - 网络
date: 2026-10-31 17:20:00
---

在 Windows 上同时开着 v2rayN 的 TUN 模式和 Tailscale，到虚拟机的连接总是 P2P 不成功：时而走 DERP 中继，时而完全 ping 不通。

这篇记录一次完整的排查和修复。最终改了三处：

1. 给 `tailscaled.exe` 的 UDP 流量加一条直连规则。
2. 把 `100.*` 加进系统代理例外。
3. 关闭 TUN 的严格路由（Strict Route）。

> 文中的 IP 地址都已替换成文档专用地址，节点名也做了处理。

# 环境

- Windows 11
- v2rayN，TUN 模式，核心为 sing-box，协议栈 `gvisor`，TUN 未开启 IPv6
- Tailscale（Windows 客户端），对端是一台 Windows 虚拟机，下文称为 `my-vm`

# 排查过程

## 确认谁接管了流量

先看路由表和 Tailscale 的状态：

```powershell
Get-NetRoute -AddressFamily IPv4 | Where-Object { $_.DestinationPrefix -eq '0.0.0.0/0' }
tailscale status
tailscale netcheck
```

默认路由指向了 `singbox_tun`，netcheck 的日志也印证了这一点：

```text
portmap: monitor: gateway and self IP changed: gw=172.18.0.2 self=172.18.0.1
```

netcheck 的结果也有问题（节选）：

```text
* IPv4: yes, 198.51.100.10:52830
* IPv6: no, but OS has support
* Nearest DERP: Toronto
* DERP latency:
    - nyc: 457.6ms
    - sea: 457.6ms
    - sao: 457.6ms
```

人在国内，最近的 DERP 却是 Toronto，各节点延迟还整齐地落在 457ms 和 557ms 附近，这不像真实的直连结果。

再看 v2rayN 生成的 `binConfigs\config.json`，路由规则里没有任何 Tailscale 相关的项，非国内目标最后都落到 `"final": "proxy"`。所以 Tailscale 的 STUN 探测很可能走了代理，探测到的公网地址是代理出口，对端拿这个地址当然打不通。

## 第一轮修复：UDP 直连

在 v2rayN 的「设置 → 路由设置」里打开当前规则集，用「从剪贴板导入规则」导入下面的 JSON（询问是否替换原有规则时选**否**），然后把它**置顶**：

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

有两点需要说明：

- **只放行 UDP：** 控制面和 DERP 中继走 TCP，在国内继续走代理更稳定，所以不要把 `tailscaled` 的全部流量都设成直连。
- **带上 `tailscale.exe`：** `tailscale netcheck` 是在 CLI 进程里发探测包的，不加它就看不到规则的效果。

置顶是为了排在 UDP 443 的拒绝规则之前。最后到 `config.json` 里确认规则已经生成：

```json
{
  "outbound": "direct",
  "network": ["udp"],
  "process_name": ["tailscaled.exe", "tailscale.exe"]
}
```

## 第二处修改：系统代理例外

在「设置 → 参数设置 → 系统代理设置」的例外列表末尾加上：

```text
;100.*
```

默认的例外列表里没有 Tailscale 的 `100.64.0.0/10` 网段，走系统代理的程序访问 Tailscale IP 时会先进 sing-box。

这种情况靠路由规则解决不了：配置里开了 `auto_detect_interface`，`direct` 出站会从物理网卡发出，到不了 Tailscale 网卡。让这些程序绕开代理，才能按路由表走 Tailscale。

副作用是其他 `100.*` 的公网地址也会绕过系统代理，一般没有影响。

## 改完之后还是不通

重启 v2rayN 的服务后，netcheck 看到的已经是真实的公网 IP，延迟也不再整齐。但连接并没有变好：

```text
100.x.x.x  my-vm  active; relay "hkg"
ping "100.x.x.x" timed out
```

路径在 `direct` 和 `relay` 之间来回跳，20 个 ping 全丢。为了定位问题，我分层测了一遍：

| 测试目标 | 结果 |
| --- | --- |
| 局域网网关 | 0 丢包，1ms |
| 国内 IPv4（`223.5.5.5`） | 0 丢包，约 9ms |
| 国内 IPv6（`2400:3200::1`） | 全部 `General failure` |
| 对端的 IPv6 地址 | 全部 `General failure` |

本地网络和 IPv4 都没问题，有问题的是 IPv6。`General failure` 说明包在本机就发不出去，可网卡上明明有 IPv6 地址和默认路由。

当时唯一可疑的就是 TUN 的严格路由：它开着，TUN 自身又没配 IPv6。

## 第三处修改：关闭严格路由

在「设置 → 参数设置 → TUN 模式设置」里关闭**严格路由**（Strict Route），然后重启服务。生成的配置变为：

```json
{
  "type": "tun",
  "strict_route": false
}
```

这是最后一块拼图，改完后 IPv6 立刻恢复了。

# 修复结果

```text
$ tailscale ping my-vm
pong from my-vm (100.x.x.x) via DERP(hkg) in 1.444s
pong from my-vm (100.x.x.x) via DERP(hkg) in 614ms
pong from my-vm (100.x.x.x) via [2001:db8:1::1]:41641 in 22ms
```

| 项目 | 关闭严格路由前 | 关闭严格路由后 |
| --- | --- | --- |
| 国内 IPv6 ping | 全部 `General failure` | 10 个全通，约 32ms |
| netcheck 的 IPv6 | `no` | `yes` |
| 到虚拟机的 ping | 20 个全丢 | 30 个全通，平均 79ms，最低 19ms，最高 567ms |
| 路径状态 | 在直连和中继之间跳 | `direct` |

# 遗留问题和注意事项

这次修复有几点局限：

- **测试时间很短：** 复测只有一分钟左右，还不能说明长期稳定。最高 567ms 说明延迟仍有波动，原因没有确认。
- **根因是推断的：** 严格路由和 IPv6 的关系来自“关掉就恢复”这个对比实验，我没有去读 sing-box 的源码确认具体机制。
- **直连靠的是 IPv6：** 这次走的是两端的 IPv6。如果对端或当前网络没有 IPv6，就要靠 IPv4 打洞，这种情况我没有验证。Tailscale 的 UDP 仍然经过 TUN 转发，IPv4 候选端口也很分散，可能还是会走中继。
- **直接 ping 对端 IPv6 仍然超时：** 关闭严格路由后，错误从 `General failure` 变成了超时，而 Tailscale 经同一个地址通信正常。多半只是对端防火墙没放行 ICMPv6，不影响使用。

关闭严格路由也有代价：

- DNS 泄漏的风险会略微上升。
- TUN 没开 IPv6，所以 IPv6 流量不经过代理，会直接从本地网络出去。这正是 Tailscale 能直连的原因，但支持 IPv6 的网站也可能直接访问，不走代理。

如果之后又变慢，先看路径，显示 `relay` 就说明又退回中继了：

```bash
tailscale status
```
