class FontLoader extends HTMLElement {
  constructor () {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
    this.font = this.getAttribute('font')

    const font = document.createElement('link')
    font.href = `https://fonts.googleapis.com/css2?family=${this.font}&display=swap`
    font.rel = 'stylesheet'
    document.head.appendChild(font)
  }
}

customElements.define('font-loader-component', FontLoader)
