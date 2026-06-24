# Nashm نشم

Nashm (نشم) is an advanced, self-hosted AI conversation platform built on top of a highly optimized and customized chat core. It is designed to deliver a premium, secure, and multi-user chat interface with tailored integrations, customer support mechanisms, and advanced membership sharing.

---

## 🌟 Unique & Custom Features in Nashm

Beyond the standard chat functionalities, Nashm includes several specialized enhancements:

- 👥 **Family Subscription Management**:
  A custom subscription sharing system allowing plan owners to add, manage, and remove up to 4 child members by their registered email address directly from their account settings.

- 🎫 **Admin Support Ticket System**:
  An integrated customer support system. Users can submit support tickets through a dedicated interface, and administrators can view, search, filter (by Open, Reviewed, Resolved), and update ticket status directly within the Admin Console.

- 🔌 **Pre-Integrated Custom AI Endpoints**:
  Out-of-the-box configuration for premium endpoints, including **Moonshot AI (Kimi)**, with customized display labels, icon assets, and prompt routing.

- 🎨 **Nashm Brand Identity & Aesthetics**:
  A customized UI featuring a striking Keffiyeh Red (`#C41E3A`) and PCB Black (`#1A1A1A`) color palette, responsive welcome interfaces (featuring *"مرحباً بك في نشم!"*), and dynamic ambient glow effects.

---

## ✨ Standard Features

- 🖥️ **UI & Experience**: Sleek, responsive chat interface inspired by ChatGPT with enhanced configurations and performance.
- 🤖 **AI Model Selection**: Compatible with Anthropic (Claude), OpenAI, AWS Bedrock, Google (Gemini), Vertex AI, and local/remote providers (Ollama, Groq, Mistral, OpenRouter, and more).
- 🔧 **Code Interpreter**: Secure, sandboxed code execution in Python, Node.js, C/C++, Go, and more.
- 🔍 **Web Search**: Integrated internet search combining search providers, scrapers, and rerankers.
- 🎨 **Image Generation & Editing**: Text-to-image and image-to-image capabilities using DALL-E, Stable Diffusion, Flux, or custom MCP servers.
- 💾 **Presets & Context Management**: Create, save, and fork conversations and custom presets mid-chat.
- 🗣️ **Speech & Audio**: Voice conversations via Speech-to-Text and Text-to-Speech integrations.
- 👥 **Multi-User & Secure Access**: Secure authentication via OAuth2, LDAP, and Email/Password login.

---

## 🛠️ Development Setup

To run Nashm locally, follow these guidelines:

### 1. Requirements
* **Node.js**: v24.16.0
* **Package Manager**: npm

### 2. Quick Start
1. Clone the repository and navigate to the project directory.
2. Install dependencies:
   ```bash
   npm run smart-reinstall
   ```
3. Set up your environment files:
   ```bash
   cp .env.example .env
   ```
4. Build the application:
   ```bash
   npm run build
   ```
5. Start the development environment:
   * Frontend: `npm run frontend:dev`
   * Backend: `npm run backend:dev`

### 3. Running Tests
* **Backend unit tests**:
  ```bash
  cp api/test/.env.test.example api/test/.env.test
  npm run test:api
  ```
* **Frontend unit tests**:
  ```bash
  npm run test:client
  ```

---

## 📝 License

Nashm is licensed under a proprietary license. See the [LICENSE](LICENSE) file for more details.
