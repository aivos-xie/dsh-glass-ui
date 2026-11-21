# Glass UI 玻璃外观 / Glass UI

为 DeepSeek Harness 的对话、侧栏、输入区和浮层添加分层磨砂与细边高光，跟随宿主的浅色和深色主题。中文界面显示 **Glass UI 玻璃外观**，英文界面显示 **Glass UI**。

## 调整外观

从左下角账号菜单打开 **设置 → Glass UI 玻璃外观**。英文界面的入口为 **Settings → Glass UI**。改动实时显示并自动保存。

- **渲染质量**提供完整玻璃、均衡、静态三档。均衡档降低模糊开销。静态档改用实色表面。
- **玻璃强度**调节磨砂模糊和底景光晕，默认 60%。
- **背景色调**提供极光、清蓝、中性三种配色，每种都随宿主切换深浅主题。
- **消息玻璃**控制用户消息气泡和助手回复的半透明底色，默认开启。
- **减少透明度**使用实色表面。极光背景动效和纹理默认关闭，可在完整玻璃档中启用。
- **恢复默认**重置本插件的外观偏好。

偏好保存在当前浏览器的 localStorage 中，并在同源窗口间同步。系统减少动态效果、减少透明度、增加对比度和强制颜色偏好实时生效。解除系统限制后，界面应用前一次所选的外观。首次使用时，有限的性能采样可能切换到均衡档。手动选择质量后，按用户所选档位渲染。

## 开发与验证

CSS 从 `src/glass.css` 及对话、控件、右栏的对应样式文件读取，客户端入口为 `src/client.tpl.js`。修改后执行：

```sh
npm run build
npm run check
npm test
```

应用加载 `lib/client.js` 构建产物。当前 desktop profile 使用本地链接引用插件文件，重载应用窗口即可加载构建结果。禁用插件时会撤销样式、主题 token、设置页、监听和运行时 API。已保存偏好可供再次启用时使用。

浏览器回归使用本机 Edge 和开发环境里的 Playwright Core：

```sh
node test-browser.mjs --module-dir C:/dsh-desktop/browser-auto-test/node_modules --output ./test-results
```

浏览器报告记录 Chromium 版本、离线宿主结构样板和实测结果。真实应用及其它插件的交互需要在其运行环境中验证。

控制台 API 可用于诊断和调节：

```js
__dshGlass.info()
__dshGlass.quality('balanced')
__dshGlass.intensity(60)
__dshGlass.tone('cool')
__dshGlass.messages(true)
__dshGlass.transparency('reduced')
__dshGlass.motion(true)
__dshGlass.texture(true)
__dshGlass.reset()
```

`info().requested` 显示用户选择的值，`info().effective` 显示受渲染档位和系统偏好影响后的实际值。
