import { store } from '../redux/store.js'
import { setElements } from '../redux/map-slice.js'

class PromptInput extends HTMLElement {
  constructor () {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
    this.socket = new WebSocket(import.meta.env.VITE_WS_URL)
    this.socketReady = false
    this.threadId = null
  }

  connectedCallback () {
    this.render()

    this.socket.addEventListener('open', () => {
      this.socketReady = true
    })

    this.socket.addEventListener('message', event => {
      const { channel, data } = JSON.parse(event.data)

      if (this.threadId && channel === this.threadId) {
        if (data.response) {
          store.dispatch(setElements(data.response))
        }

        if (data.message) {
          this.shadow.querySelector('.status-text').textContent = data.message
        }

        if (typeof data.completePercentage === 'number') {
          const pct = Math.max(0, Math.min(100, data.completePercentage))
          this.shadow.querySelector('.status-bar').style.width = `${pct}%`
          this.shadow.querySelector('.status-pill').textContent = `${pct}%`
        }
      }
    })

    this.socket.addEventListener('close', () => { this.socketReady = false })
    this.socket.addEventListener('error', () => { this.socketReady = false })
  }

  wsSend (obj) {
    if (!this.socketReady) return
    this.socket.send(JSON.stringify(obj))
  }

  wsSubscribe (channel) { this.wsSend({ type: 'subscribe', channel }) }
  wsUnsubscribe (channel) { this.wsSend({ type: 'unsubscribe', channel }) }

  render () {
    this.shadow.innerHTML =
    /* html */`
      <style>

        * {
          box-sizing: border-box;
          font-family: 'Lato', sans-serif;
        }

        :host{
          width: 100%;
        }

        .prompt-input{
          width: 100%;
        }

        form{
          align-items: center;
          background-color: hsl(0, 0%, 100%);
          border: 1px solid hsl(0, 0%, 40%);
          border-radius: 0.3rem;
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
        }

        .form-element{
          height: max-content;
          width: 90%
        }

        .form-element input{
          background-color: hsl(0, 0%, 100%);
          border: none;
          color: hsl(0, 0%, 0%);
          display: flex;
          font-family: 'Lato', sans-serif;
          font-size: 0.9rem;
          height: 1.2rem;
          max-height: 5rem;
          resize: none;
          width: 100%;
        }

        .form-element input::placeholder{
          color: hsl(0, 0%, 0%);
          font-weight: 300;
        }

        .form-element input:focus{
          outline: none;
        }

        .send-button{
          display: none;
        }

        .send-button.visible{
          display: block;
        }

        .send-button button{
          align-items: center;
          background-color: hsl(240, 8%, 80%);
          border: none;
          border-radius: 0.5rem;
          display: flex;
          padding: 0.1rem 0.2rem;
        }

        .send-button svg{
          color: hsl(0, 0%, 100%);
          width: 1.3rem;
        }

        .send-button.active button{
          background-color: hsl(280deg 56% 47%);
          cursor: pointer;
        }

        .send-button.active svg{
          color:hsl(0, 0%, 100%);
        }

        .send-button .tooltiptext{
          background-color: black;
          border-radius: 0.5rem;
          color: #fff;
          font-family: 'SoehneBuch', sans-serif;
          font-size: 0.8rem;
          margin-top: 5rem;
          margin-left: -5rem;
          opacity: 0;
          padding: 0.5rem 0;
          pointer-events: none; 
          position: absolute;
          text-align: center;
          transition: opacity 0.3s;
          width: 120px;
          z-index: 1001;
        }

        .send-button .tooltiptext::after {
          border-width: 5px;
          border-style: solid;
          border-color: transparent transparent rgb(0, 0, 0) transparent;
          content: "";
          left: 70%;
          position: absolute;
          top: -10px;   
        }

        .send-button:hover .tooltiptext{
          opacity: 1;
          visibility: visible;
        }

        .stop-button {
          align-items: center;
          background-color: transparent;
          border: 0.1rem solid hsl(0, 0%, 100%);
          border-radius: 50%;
          display: none;
          height: 1rem;
          justify-content: center;
          padding: 0.3rem;
          width: 1rem;
        }

        .stop-button.visible {
          display: flex;
        }

        .stop-button button {
          background-color: hsl(0, 0%, 100%);
          border: none;
          border-radius: 0;
          cursor: pointer;
          height: 0.75rem;
          width: 0.25rem;
        }

        .status{
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          height: auto;
          max-height: 0;
          opacity: 0;
          transform: translateY(-6px);
          transition: max-height 260ms ease, opacity 220ms ease, transform 220ms ease;
          margin-top: 0.75rem;
        }

        .status.active{
          max-height: 140px;
          opacity: 1;
          transform: translateY(0);
        }

        .status-card{
          backdrop-filter: blur(10px);
        }

        .status-top{
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.6rem;
        }

        .status-text{
          margin: 0;
          color: hsl(280deg 56% 47%);
          font-size: 0.95rem;
          font-weight: 650;
          letter-spacing: 0.2px;
          line-height: 1.15;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status-pill{
          flex: 0 0 auto;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.4px;
          color: hsl(280deg 56% 47%);
          padding: 0.22rem 0.55rem;
        }

        .progress{
          position: relative;
          height: 10px;
          border-radius: 999px;
          background: hsla(0,0%,60%,0.10);
          overflow: hidden;
        }

        .status-bar{
          height: 100%;
          width: 0%;
          border-radius: 999px;
          background: linear-gradient(90deg, hsl(280deg 56% 47%), hsl(280deg 56% 47%));
          transition: width 260ms ease;
          position: relative;
        }

        .status-bar::after{
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg,
            transparent 0%,
            hsl(280deg 56% 47%) 50%,
            transparent 100%);
          transform: translateX(-60%);
          animation: sheen 1.2s ease-in-out infinite;
          opacity: 0.55;
        }

        @keyframes sheen{
          0%   { transform: translateX(-60%); }
          100% { transform: translateX(60%); }
        }
      </style>
    
      <section class="prompt-input">
        <form>
          <div class="form-element">
            <input type="text" placeholder="Escribe aquí qué tipo de casa estás buscando...">
          </div>
          <div class="interaction-button">
            <div class="send-button visible">
              <button disabled>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-white dark:text-black">
                  <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>            
                <span class="tooltiptext">Enviar mensaje</span>                  
              </button>
            </div>
          </div>
        </form>
        <div class="status" aria-live="polite">
          <div class="status-card">
            <div class="status-top">
              <p class="status-text"></p>
              <span class="status-pill">0%</span>
            </div>

            <div class="progress">
              <div class="status-bar"></div>
            </div>
          </div>
        </div>
      </section>
    `

    const prompt = this.shadow.querySelector('input')
    const sendButton = this.shadow.querySelector('.send-button button')

    prompt.focus()

    prompt.addEventListener('input', () => {
      this.sendButtonState(prompt)
    })

    prompt.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        this.sendPrompt(prompt.value)
      }
    })

    sendButton.addEventListener('click', (event) => {
      event.preventDefault()
      this.sendPrompt(prompt.value)
    })
  }

  sendButtonState (prompt) {
    if (prompt.value.length > 0) {
      this.shadow.querySelector('.send-button').classList.add('active')
      this.shadow.querySelector('.send-button button').disabled = false
    } else {
      this.shadow.querySelector('.send-button').classList.remove('active')
      this.shadow.querySelector('.send-button button').disabled = true
    }
  }

  async sendPrompt (prompt) {
    this.render()

    const data = {
      prompt
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/customer/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      this.resetStatus()
      const result = await response.json()
      this.threadId = result.insertedId
      this.wsSubscribe(result.insertedId)
    } catch (error) {
      this.resetStatus()
      this.shadow.querySelector('.status-text').textContent = 'Error al enviar la consulta'
    }
  }

  resetStatus () {
    this.shadow.querySelector('.status').classList.add('active')
    this.shadow.querySelector('.status-text').textContent = 'Enviando consulta...'
    this.shadow.querySelector('.status-pill').textContent = '0%'
    this.shadow.querySelector('.status-bar').style.width = '0%'
  }
}

customElements.define('prompt-input-component', PromptInput)
