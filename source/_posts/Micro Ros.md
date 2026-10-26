---
title: Micro Ros
tags:
  - Micro Ros
abbrlink: 96817998
date: 2024-11-17 14:51:20
---

# 前言

大三的时候做了一个四足机器狗，当时想着能不能和ROS结合一下，但由于种种原因，只是草草的在Arduino上跑了跑例程，没能深入去研究学习。最近工作上需要用到Micro Ros，借着这个机会试试能不能更深入的学习一下。

![fc24435c66be74e9b282ccfaa1c8cf77](./Micro%20Ros/fc24435c66be74e9b282ccfaa1c8cf77.png)

![image-20241124154809184](./Micro%20Ros/image-20241124154809184.png)

上图与本文无关，只是突然感概时间匆匆，所以将SBOT照片放在这里。

因为对于ROS并没有过于深入的去了解过，只能重新开始学习了解。所以在写这篇文章的时候，对于如何组织文章的结构比较茫然，再三思考，反正只是一个学习的记录，暂时没必要把结构梳理得太清楚，索性学到哪儿写到哪儿，学到什么些什么。

# 编译libmicroros.a

因为工作上需要运行Micro Ros的芯片是一个Coretex A核的芯片，需要在RT-Thread上运行这个库。但是谷歌和Github上找了一下运行的方法，大概的步骤可以总结为：编译出对应平台上的**libmicroros.a**这个静态库接着是对接好相应的接口就可以了。

这里也列出几个我参考的文章：

[在 RTOS 上移植 MicroROS (ROS2)](https://zhuanlan.zhihu.com/p/548378504)

[在 RT-Thread上运行 micro ros](https://club.rt-thread.org/ask/article/6bccb9124f78f873.html)

[Creating custom static micro-ROS library](https://micro.ros.org/docs/tutorials/advanced/create_custom_static_library/)

尝试了RT-Thread官方维护的[micro_ros_rtthread_component](https://github.com/micro-ROS/micro_ros_rtthread_component)跟着文档各种配置环境，但是最终以失败告终。接着我又尝试了用Docker编译官方维护的[micro_ros_arduino](https://github.com/micro-ROS/micro_ros_arduino)工程，经过一通乱搞，不出意外也失败了。最终选择还是选择用[micro-ros-setup](https://github.com/micro-ROS/micro_ros_setup)，至少不用再去配置Docker了。

那么接下来开始吧，简单记录一下我如何编译出我需要的**libmicroros.a**。

1、准备一个Ubuntu22.04的虚拟机，为了接下来的工作能够较为顺利的完成，不出现一些奇奇怪怪的环境问题，推荐使用22.04版本的Ubuntu。

2、安装ROS2。因为micro_ros_setup其实是ROS的一个功能包，编译运行需要依赖ROS2，所以需要装上ROS2。

安装学习ROS2可以参考鱼香ROS大佬的系列文章[ROS2机器人入门到实战](https://blog.csdn.net/qq_27865227/article/details/131363638)，安装教程[一键直达](https://blog.csdn.net/qq_27865227/article/details/131365548)。

安装完成后一定记得执行一下命令：

```shell
echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc
```

将ROS添加到系统环境中。

3、安装Git。

已经安装过可以忽略此步骤，执行命令：

```shell
sudo apt install git
```

后面需要用git克隆大量的仓库，但是再虚拟机中访问Github的仓库时候大概率会遇到网络问题。

解决方法有两个。

**解决方法一**

第一种是使用”科技“。

启动你的”科技“，在”科技“软件中启用局域网代理。

进入windows的设置中，查看你的代理端口号，记住他，后面可能会经常用到。

![image-20241124163023786](./Micro%20Ros/image-20241124163023786.png)

将虚拟机网卡设置为桥接模式。

![image-20241124163142206](./Micro%20Ros/image-20241124163142206.png)

配置git代理，输入命令：

```shell
git config --global http.proxy http://电脑ip:代理端口
git config --global https.proxy http://电脑ip:代理端口
```

![image-20241124163453089](./Micro%20Ros/image-20241124163453089.png)

使用``git config --list``查看刚才的配置。

**解决方法二**

为什么要有两个解决方法呢，因为后面在编译静态库的时候，有可能即使你设置了代理Git依然会失败。

首先取消掉刚才设置的代理，输入命令：

```shell
git config --global --unset http.proxy
git config --global --unset https.proxy
```

去网上找一下国内的Github镜像网站，例如[gitclone](https://gitclone.com/)。

然后按照网站上的提示设置

```shell
git config --global url."https://gitclone.com/".insteadOf https://
```

基本原理都是配置git在克隆某个仓库的时候去替换掉仓库的链接的一部分，这样就可以走代理网站加速克隆了。每个代理网站的替换方式有区别，并且这些网站可能随时挂掉，所以需要自行寻找然后配置insteadof。

4、克隆micro_ros_setup。

根据Github上的[教程](https://github.com/micro-ROS/micro_ros_setup)安装即可。

找一个干净的目录，依次执行一下命令：

```shell
source /opt/ros/$ROS_DISTRO/setup.bash # 如果前面执行过 echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc 这条命令可以忽略

mkdir uros_ws && cd uros_ws

git clone -b $ROS_DISTRO https://github.com/micro-ROS/micro_ros_setup.git src/micro_ros_setup

rosdep update && rosdep install --from-paths src --ignore-src -y

colcon build

source install/local_setup.bash
```

更新ros依赖的时候大概率会遇到网络方面的问题，鱼香ROS大佬也帮我们解决了，按照这个[教程](https://zhuanlan.zhihu.com/p/398754989)配置。

配置完成后后续在有使用到``rosdep``命令时全部替换成``rosdepc``即可。

![image-20241124170004309](./Micro%20Ros/image-20241124170004309.png)

5、编译**libmicroros.a**

接下来就可以依据这个教程编译静态库了[Creating custom static micro-ROS library](https://micro.ros.org/docs/tutorials/advanced/create_custom_static_library/)。

大概的步骤和官方说的差不多，主要涉及到工具链的设置以及colcon.meta配置。

我以RK3566举例，RK3566是cortexa55核的芯片。

首先使用命令创建一个通用的lib，注意如果网络有问题这一步很容易失败。

```shell
ros2 run micro_ros_setup create_firmware_ws.sh generate_lib
```

![image-20241124171949763](./Micro%20Ros/image-20241124171949763.png)

创建Cmake和配置文件。

```
touch cortexa55_toolchain.cmake
touch cortexa55_colcon.meta
```

根据实际情况编写Cmake和配置文件

cortexa55_toolchain.cmake内容：

```shell
# 设置目标系统为通用嵌入式
set(CMAKE_SYSTEM_NAME Generic)

# 启用交叉编译模式
set(CMAKE_CROSSCOMPILING 1)

# 设置编译目标类型
set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)

# 设置AArch64工具链路径及编译器
set(CMAKE_C_COMPILER "/home/ss/WorkSpace/uros_ws/gcc-arm-8.3-2019.03-x86_64-aarch64-elf/bin/aarch64-elf-gcc")
set(CMAKE_CXX_COMPILER "/home/ss/WorkSpace/uros_ws/gcc-arm-8.3-2019.03-x86_64-aarch64-elf/bin/aarch64-elf-g++")

# 确保编译器可用
set(CMAKE_C_COMPILER_WORKS 1 CACHE INTERNAL "")
set(CMAKE_CXX_COMPILER_WORKS 1 CACHE INTERNAL "")

# AArch64优化编译标志
set(FLAGS "-O2 -ffunction-sections -fdata-sections -fno-exceptions -mcpu=cortex-a53 -nostdlib --param max-inline-insns-single=500 -D'RCUTILS_LOG_MIN_SEVERITY=RCUTILS_LOG_MIN_SEVERITY_NONE'" CACHE STRING "" FORCE)

# C语言编译标志
set(CMAKE_C_FLAGS_INIT "-std=c11 ${FLAGS} -DCLOCK_MONOTONIC=0 -D'__attribute__(x)='" CACHE STRING "" FORCE)

# C++语言编译标志
set(CMAKE_CXX_FLAGS_INIT "-std=c++11 ${FLAGS} -fno-rtti -DCLOCK_MONOTONIC=0 -D'__attribute__(x)='" CACHE STRING "" FORCE)

# 设置字节序为小端
set(__BIG_ENDIAN__ 0)
```

cortexa55_colcon.meta内容：

```shell
{
    "names": {
        "tracetools": {
            "cmake-args": [
                "-DTRACETOOLS_DISABLED=ON",  // 禁用 tracetools 库，该库用于跟踪 ROS 2 运行时的行为
                "-DTRACETOOLS_STATUS_CHECKING_TOOL=OFF"  // 禁用状态检查工具，用于减少不必要的调试信息
            ]
        },
        "rosidl_typesupport": {
            "cmake-args": [
                "-DROSIDL_TYPESUPPORT_SINGLE_TYPESUPPORT=ON"  // 启用单一类型支持，可能是为了减少代码生成的复杂度或内存开销
            ]
        },
        "rcl": {
            "cmake-args": [
                "-DBUILD_TESTING=OFF",  // 禁用测试构建，减少构建时间
                "-DRCL_COMMAND_LINE_ENABLED=OFF",  // 禁用 RCL 的命令行工具功能
                "-DRCL_LOGGING_ENABLED=OFF"  // 禁用 RCL 的日志功能
            ]
        }, 
        "rcutils": {
            "cmake-args": [
                "-DENABLE_TESTING=OFF",  // 禁用 rcutils 测试功能
                "-DRCUTILS_NO_FILESYSTEM=ON",  // 禁用文件系统支持，减少内存使用
                "-DRCUTILS_NO_THREAD_SUPPORT=ON",  // 禁用线程支持，适用于没有线程的环境
                "-DRCUTILS_NO_64_ATOMIC=ON",  // 禁用 64 位原子操作支持，可能是为了兼容 32 位系统
                "-DRCUTILS_AVOID_DYNAMIC_ALLOCATION=ON"  // 避免使用动态内存分配，减少堆内存的使用
            ]
        },
        "microxrcedds_client": {
            "cmake-args": [
                "-DUCLIENT_PIC=OFF",  // 禁用编译时的 PIC (Position Independent Code)，可能是为了某些平台的优化
                "-DUCLIENT_PROFILE_UDP=OFF",  // 禁用 UDP 协议支持
                "-DUCLIENT_PROFILE_TCP=OFF",  // 禁用 TCP 协议支持
                "-DUCLIENT_PROFILE_DISCOVERY=OFF",  // 禁用自动发现功能
                "-DUCLIENT_PROFILE_SERIAL=OFF",  // 禁用串行通信支持
                "-UCLIENT_PROFILE_STREAM_FRAMING=ON",  // 启用流分帧支持
                "-DUCLIENT_PROFILE_CUSTOM_TRANSPORT=ON"  // 启用自定义传输配置
            ]
        },
        "rmw_microxrcedds": {
            "cmake-args": [
                "-DRMW_UXRCE_MAX_NODES=1",  // 设置最大节点数为 1，适用于节点数量较少的场景
                "-DRMW_UXRCE_MAX_PUBLISHERS=5",  // 设置最大发布者数为 5
                "-DRMW_UXRCE_MAX_SUBSCRIPTIONS=5",  // 设置最大订阅者数为 5
                "-DRMW_UXRCE_MAX_SERVICES=1",  // 设置最大服务数为 1
                "-DRMW_UXRCE_MAX_CLIENTS=1",  // 设置最大客户端数为 1
                "-DRMW_UXRCE_MAX_HISTORY=4",  // 设置最大消息历史数量为 4
                "-DRMW_UXRCE_TRANSPORT=custom"  // 设置传输类型为自定义，适用于特殊的传输配置
            ]
        }
    }
}
```

下载[工具链](https://developer.arm.com/downloads/-/gnu-a/8-3-2019-03)放到对应的目录下。

![image-20241124172812291](./Micro%20Ros/image-20241124172812291.png)

![image-20241124172730046](./Micro%20Ros/image-20241124172730046.png)

![image-20241124173040941](./Micro%20Ros/image-20241124173040941.png)

注意刚才cmake脚本中设置的工具链路径。

```shell
# 设置AArch64工具链路径及编译器
set(CMAKE_C_COMPILER "/home/ss/WorkSpace/uros_ws/gcc-arm-8.3-2019.03-x86_64-aarch64-elf/bin/aarch64-elf-gcc")
set(CMAKE_CXX_COMPILER "/home/ss/WorkSpace/uros_ws/gcc-arm-8.3-2019.03-x86_64-aarch64-elf/bin/aarch64-elf-g++")
```

输入命令编译。

```shell
source install/local_setup.bash && ros2 run micro_ros_setup build_firmware.sh $(pwd)/cortexa55_toolchain.cmake $(pwd)/cortexa55_colcon.meta
```

编译成功后，静态库保存在**./firmware/build/**目录下。

![image-20241124173621475](./Micro%20Ros/image-20241124173621475.png)

6、总结

编译配置其实蛮简单的，最大的问题是网络，网络不好很容易遇到奇奇怪怪的问题导致编译失败。

# 移植Micro Ros

