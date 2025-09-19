# 💬 Toolpop

💬 **Toolpop** is a lightweight Vue 3 `v-pop` directive for reactive tooltips and simple HTML/image popovers.

### ✨🎨✨ **NEW!** You can now fully customize the tooltip's appearance!

> [!CAUTION]
> 
> 🚨 Breaking change 🚨
>
> The method for manually registering the ✒️ directive has changed. You now need to import and call `createPop()`.
>
> ```diff
> // main.ts
> - import { pop } from 'toolpop'
> - app.directive('pop', pop)
>
> + import { createPop } from 'toolpop'
> + app.directive('pop', createPop())
> ```
If you 🧩 Use as Plugin, you are ok - no change.

[DEMO](https://toolpop.jsonkody.cz)

[Live Demo on StackBlitz](https://stackblitz.com/github/JsonKody/toolpop_demo?file=src%2FApp.vue)

```html
<p v-pop="'Simple tooltip'">Hover me</p>
```

![screenshot](./screenshot.png)

- 🎁 **tiny - only 1 dependency:** [@floating-ui/dom
  ](https://www.npmjs.com/package/@floating-ui/dom) [(web)](https://floating-ui.com)
- ✨ Auto-flipping + positioning with `top`, `right`, etc.
- ⚡ Supports reactive values, `ref`, `computed`, functions
- 🧩 Optional HTML/image mode via `.html`

---

## 🚀 Installation

with **pnpm**:

```sh
pnpm add toolpop
```

with **npm**:

```sh
npm install toolpop
```

---

## 🧩 Use as Plugin

```ts
// main.ts
import Toolpop from 'toolpop'
// ...
app.use(Toolpop)
// Registers v-pop globally with default options
```

With options:

```ts
// main.ts
import Toolpop from 'toolpop'
// ...
// main.ts
app.use(Toolpop, {
  fontSize: 14,
  paddingX: 8,
  paddingY: 0,
  duration: 0.15,
  fontFamily: 'system-ui, sans-serif',
  color: 'white',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderColor: 'rgba(255, 255, 255, 0.28)',
  borderRadius: 6,
  scaleStart: 0.75,
  blur: 14,
})
```

## ✒️ Use as Directive

```ts
// main.ts
import { createPop } from 'toolpop'

// Registers v-pop globally
app.directive('pop', createPop()) // name "pop" whatever you want

// .. or with options - every option is optional, so you may pass only what you need
app.directive('pop', createPop({ color: 'orange' }))
```

You can also rename it:

```ts
app.directive('gandalf', pop)
```

```html
<p v-gandalf="'A wizard is never late...'">Quote</p>
```

---

## ✏️ Options

```ts
interface PopOptions {
  fontSize: number
  paddingX: number
  paddingY: number
  duration: number
  fontFamily: string
  color: string
  backgroundColor: string
  borderColor: string
  borderRadius: number
  scaleStart: number
  blur: number
}
```

For typed custom options when registering the directive manually:


```ts
import { createPop, type PopOptions } from 'toolpop'

const options: Partial<PopOptions> = {
  fontSize: 28,
  paddingX: 15,
  paddingY: 4,
  blur: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
}

app.directive('pop', createPop(options))
```

---

## ⚙️ Modifiers

- `top`, `right`, `bottom`, `left` – tooltip placement (`top` is default, so you can omit it)
- `html` – interpret value as raw HTML (e.g. images or rich markup)
- `click` – shows the tooltip on click instead of hover
  - `leave` – hides the tooltip on mouseleave (only useful with `.click`)

---

## 💡 Example

[DEMO](https://toolpop.jsonkody.cz)

[Live Demo on StackBlitz](https://stackblitz.com/github/JsonKody/toolpop_demo?file=src%2FApp.vue)

Simple static text:

```html
<p v-pop="'Hello world!'">Hover me</p>
<!-- You need to insert string, or function that return string -->
<!-- Or Vue reactive value as ref, computed ... -->
```

Reactive value:

```html
<button v-pop="`Count: ${count}`" @click="count++">Click me</button>
```

Raw HTML image:

```html
<!-- in JS store
 const my_image = '<img src=https://bekinka.cz/images/logo_smile.webp>' -->

<p v-pop.html="my_image">Image tooltip</p>
```

`.click` and `.leave`:

```html
<!-- Click-activated tooltip that hides on mouseleave -->
<button v-pop.click.leave="'Click tooltip'">Click me</button>
```

---

## 📁 Local use (optional)

Copy `src/pop.ts` into your project and register locally:

```ts
import { createPop } from '@/directives/pop' // path where you put it ...
app.directive('pop', createPop()) // name "pop" whatever you want
```

---

## 🌍 Live Projects

- [jsonkody.cz](https://jsonkody.cz)
- [num.jsonkody.cz](https://num.jsonkody.cz)
- [snejk.bekinka.cz](https://snejk.bekinka.cz)

---

## 🪪 License

[MIT](https://github.com/jsonkody/toolpop/blob/main/LICENSE) © 2025 [JsonKody](https://github.com/jsonkody)
