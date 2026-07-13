import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProveedor } from './contextos/AuthContexto'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProveedor>
        <App />
      </AuthProveedor>
    </BrowserRouter>
  </React.StrictMode>,
)
