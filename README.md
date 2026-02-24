# Markmap HTML to PDF/PNG

## 快速使用

系统要求：

- markmap-cli@0.18.11
- puppeteer@19.11.1

安装：

```bash
npm install -g .
```

使用方法：

1. Markmap HTML to PNG
   ```bash
   mmap -i input.html -o output.png -s 3
   ```

2. Markmap HTML to PDF
   ```bash
   mmap -i input.html -o output.pdf
   ```

## 为什么选择导出 PDF 而非 SVG？

### 导出的 SVG 图片有时会缺失部分或全部文本

这是一个非常典型的前端渲染问题。简单来说，当你直接从浏览器导出的 HTML 中“拎出”一个 SVG 时，**字体和样式信息往往没有被正确地封装进 SVG 代码中**。

以下是导致文字缺失的几个核心原因：

1. **外部样式表依赖**：
   
   `markmap` 使用 CSS 来控制文字的字体（通常是系统的无衬线字体）、颜色和粗细。当你只导出 SVG 标签时，这些 CSS 留在 HTML 的 `<style>` 标签里了，SVG 失去了样式指引，文字可能变成了白色、透明或因高度塌陷而无法显示。

2. **ForeignObject 兼容性**：
   
   Markmap 为了支持 Markdown 的丰富格式（如加粗、斜体、链接），在 SVG 中使用了 `<foreignObject>` 标签来嵌入 HTML。许多基础的 SVG 查看器或矢量绘图软件（如旧版 AI 或某些在线转换器）无法解析这种标签。

   Markmap 的文字**不是**真正的 SVG 文字（`<text>`），而是包装在 `<foreignObject>` 标签里的 **标准 HTML `<div>**`。

      * **浏览器的懒惰：** 浏览器渲染网页时，会自动计算 `div` 的宽高。但在 SVG 文件独立存在时，浏览器不会为 `foreignObject` 自动计算尺寸。如果属性里没有明确写死 `width="200" height="100"`，它在渲染时就会被当作 `0x0` 像素，导致文字“隐身”。
      * **兼容性断层：** 许多 SVG 查看器（甚至包括旧版的某些浏览器或特定的 Markdown 编辑器）根本不支持渲染 `foreignObject` 内部的 HTML 内容。

3. **动画与生命周期冲突**：

   Markmap 是动态生成的。从 Markdown 变成 SVG 经历了好几个阶段：
   `Markdown -> JSON -> D3 Layout -> KaTeX Render -> WebFont Load -> D3 Animation`。
   如果 Puppeteer 抓取的时间点不对（比如字体还没加载完，或者动画还在进行中），导出的 SVG 就会是空的或者错位的。
      
   Markmap 是通过 D3.js 动态计算位置的。如果你在页面还没完全加载完成（计算完坐标）时就尝试提取代码，文字可能还没被填入 DOM 树。

4. KaTeX 与 CSS 的“解耦”

   你的思维导图里有公式，KaTeX 渲染公式依赖于大量的外部 CSS 样式和特殊的 **WebFonts（字体文件）**。

   * 当你把 SVG 导出为独立文件时，它就失去了与页面上 `katex.min.css` 的联系。
   * 即便我们内联了 CSS，如果 SVG 文件找不到那些 `.woff2` 字体文件，公式就会变成一堆乱码或者奇怪的符号。

### 导出的 SVG 图片用 Inkscape 打开时出现乱码

这是因为 Markmap 渲染的本质是 **HTML inside SVG**。

由于使用了 `<foreignObject>`，文字实际上是包裹在 `<div>` 里的。**大多数矢量编辑软件对这种嵌套结构的兼容性极差。**

如果你的目标是**得到一张清晰、可缩放的图**，而不仅仅是纠结于 `.svg` 后缀，我建议你改用 **PDF 导出**。

### 为什么 PDF 更好？

* PDF 会把所有字体、样式、HTML 内容强制“固化”在文件里。
* 它是矢量格式，依然可以无限放大不模糊。

**建议：** 如果你需要把思维导图放到设计稿里，建议先导出 **高分辨率 PNG**，或者通过 **虚拟打印机存为 PDF** 后再导入设计软件。


## 参考

- https://github.com/markmap/markmap/issues/66
- https://github.com/googol4u/md2mm-svg