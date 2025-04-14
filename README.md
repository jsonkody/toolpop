# 💬 Toolpop

🎯 **Toolpop** is a lightweight Vue 3 `v-pop` directive for reactive tooltips and simple HTML/image popovers.

[Live Demo on StackBlitz](https://stackblitz.com/edit/toolpop?file=src%2FApp.vue)

```html
<p v-pop="'Simple tooltip'">Hover me</p>
```

![screenshot](./screenshot.png)

- 📦 **1 tiny dependency:** [Floating UI](https://floating-ui.com)
- 🎯 Auto-flipping + positioning with `top`, `right`, etc.
- ⚡ Supports reactive values, `ref`, `computed`, functions
- 🧩 Optional HTML/image mode via `.html`

---

## 📦 Installation

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
import Toolpop from "toolpop";
// ...
app.use(Toolpop); // Registers v-pop globally
```

## 🧪 Use as Directive

```ts
// main.ts
import { pop } from "toolpop";
// ...
app.directive("pop", pop); // Registers v-pop globally
```

You can also rename it:

```ts
app.directive("gandalf", pop);
```

```html
<p v-gandalf="'A wizard is never late...'">Quote</p>
```

---

## 🛠️ Modifiers

- `top | right | bottom | left` – tooltip placement (default is `top`, so you can omit it)
- `html` – interpret value as raw HTML (e.g. images or rich markup)

---

## 💡 Example

[Live Demo on StackBlitz](https://stackblitz.com/edit/toolpop?file=src%2FApp.vue)

Simple static text:

```html
<p v-pop="'Hello world!'">Hover me</p>
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

---

## 📁 Local use (optional)

Copy `src/pop.ts` into your project and register locally:

```ts
import { pop } from "@/directives/pop"; // path where you put it ...
app.directive("pop", pop);
```

---

## 🌍 Live Projects

- [jsonkody.cz](https://jsonkody.cz)
- [num.jsonkody.cz](https://num.jsonkody.cz)

---

## 🪪 License

[MIT](https://github.com/JsonKody/toolpop/blob/main/LICENSE) © 2025 [JsonKody](https://github.com/JsonKody)
