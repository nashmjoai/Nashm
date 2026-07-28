# Nashm نشم

Nashm (نشم) is an advanced, self-hosted AI conversation platform built on top of a highly optimized and customized chat core. It is designed to deliver a premium, secure, and multi-user chat interface with tailored integrations, customer support mechanisms, and advanced membership sharing. It serves as an ultimate AI workspace for professionals, developers, and university students.

---

## 🌟 Unique & Custom Features in Nashm

Beyond the standard chat functionalities, Nashm has been developed over months to include powerful features that redefine the AI interaction experience:

- 🧠 **Deep Reasoning & Analysis**: An intelligent processing system that understands user intent, breaks down complex problems, and analyzes them step-by-step before delivering the optimal output.
- 🤖 **Multiple AI Models**: Seamless access to state-of-the-art AI models including **Claude**, **Google Antigravity**, OpenAI, AWS Bedrock, Vertex AI, and local providers to suit any specific task.
- ✨ **Interactive Artifacts**: Go beyond text. Generate fully functional websites, web applications, detailed reports, and interactive presentations that can be viewed and interacted with directly inside the platform.
- 💻 **Run Code (Code Interpreter)**: A secure, sandboxed execution environment to write, test, and run code instantly in Python, Node.js, C/C++, Go, and more.
- 🎨 **Image Generation**: Advanced text-to-image capabilities using tools like DALL-E, Stable Diffusion, or Flux to create visual assets effortlessly.
- 🔍 **Advanced Search Capabilities**: 
  - **Web Search**: Real-time information gathering from the internet.
  - **File Search**: Intelligent search through your uploaded files and documents.
- 🛠️ **Unmatched Customization**:
  - **Custom Agents**: Build specialized AI agents tailored for specific repetitive tasks.
  - **Skills**: Extend the AI's capabilities by adding custom tools and scripts.
  - **Memories & Prompts**: Save your best prompts and let the AI retain context over time for a deeply personalized experience.
- ⚙️ **MCP (Model Context Protocol) Settings**: Advanced configurations for integrating your own tools and data sources.
- 👥 **Family Subscription Management**: A custom subscription sharing system allowing plan owners to add, manage, and remove up to 4 child members directly from their account settings.
- 🎫 **Admin Support Ticket System**: An integrated customer support system for efficient issue tracking and resolution.
- 🎨 **Nashm Brand Identity & Aesthetics**: A customized UI featuring a striking Keffiyeh Red (`#C41E3A`) and PCB Black (`#1A1A1A`) color palette, responsive welcome interfaces, and dynamic ambient glow effects.

---

## 🔒 Security & Privacy First

We understand that data privacy is critical for professionals and organizations. Nashm is built with the highest security standards:
- **End-to-End Encryption**: Full encryption for all chats, files, and generated images to ensure absolute privacy.
- **Secure Access**: Robust authentication via OAuth2, LDAP, and Email/Password login.

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
