# OrganizAE 📊

**OrganizAE** é um sistema completo e moderno de gestão financeira pessoal e familiar desenvolvido com **React**, **TypeScript**, **Tailwind CSS v4**, **Firebase** e **Inteligência Artificial (Google Gemini 2.0 Flash)**.

---

## 🌐 Produção e Acesso

- **Site Web Oficial:** [https://organizae-a9590.web.app](https://organizae-a9590.web.app)
- **Repositório GitHub:** [https://github.com/CassianoMn/OrganizAE](https://github.com/CassianoMn/OrganizAE)

---

## 🚀 Funcionalidades Principais

- **🌙 Modo Escuro (Dark Mode Native)**
  - Suporte completo ao Modo Claro e Modo Escuro com alternância por botão no menu (`Sun`/`Moon`).
  - Salvamento automático da preferência do usuário no `localStorage`.

- **📅 Seletor de Ano Único & Períodos Dinâmicos**
  - Seleção simples de ano (padrão no ano atual).
  - Opções dinâmicas personalizadas por ano: Mês específico, Trimestre (Q1 a Q4), Semestre (S1 e S2), Ano Completo ou Todo o Período.

- **📊 Visão Geral & Orçamento (Dashboard)**
  - Acompanhamento de Saldo Inicial, Saldo Final e Economia do período selecionado.
  - Orçamentos planejados vs. Despesas e Rendas reais categorizadas.
  - Gráficos interativos com **Recharts** para análise visual da saúde financeira.

- **🧾 Gestão de Transações com OCR por IA**
  - Registro e edição de Despesas e Rendas com categorias personalizadas.
  - **Importação com IA (Google Gemini 2.0 Flash)**: Envie a foto de extratos ou notas fiscais e a IA extrai automaticamente estabelecimentos, valores, categorias e datas.
  - **Sistema de Fallback e Resiliência**: Fallback automático entre modelos (`gemini-2.0-flash`, `gemini-2.0-flash-lite`) em caso de limites de cota ou indisponibilidade temporária.
  - **Modal Interativo de Chave API (🔑)**: Permite inserir ou atualizar a Gemini API Key diretamente na interface web sem a necessidade de reconstruir a aplicação.

- **🛒 Módulo de Mercado Inteligente**
  - Controle detalhado de compras de supermercado com cálculo de itens e divisão por categorias (*Proteína, Higiene, Limpeza, Bebida, Lanche, etc.*).
  - **Leitura de Nota Fiscal de Mercado**: Adiciona todos os itens, quantidades, preços unitários e cria o lançamento financeiro correspondente automaticamente.

- **🔐 Autenticação e Segurança em Nuvem**
  - Autenticação via Google (**Firebase Authentication**).
  - Sincronização em tempo real via **Firebase Firestore** com regras de segurança (*Firestore Security Rules*) por usuário e grupo familiar compartilhado.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts.
- **Backend & Banco de Dados**: Firebase Firestore & Firebase Auth.
- **Hospedagem & Deploy**: Firebase Hosting.
- **Inteligência Artificial**: Google GenAI SDK (`@google/genai` - Gemini 2.0 Flash & Gemini 2.0 Flash Lite).

---

## 📦 Como Rodar o Projeto Localmente

### Pré-requisitos
- Node.js instalado (versão 18+)

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/CassianoMn/OrganizAE.git
   cd OrganizAE/code
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Configurar as Variáveis de Ambiente (Opcional):**
   Você pode criar um arquivo `.env` na raiz do código ou simplesmente informar sua chave diretamente na tela da aplicação pelo botão 🔑:
   ```env
   GEMINI_API_KEY="SUA_CHAVE_API_GEMINI"
   ```

4. **Iniciar o Servidor Local:**
   ```bash
   npm run dev
   ```
   Acesse a aplicação localmente no navegador.

---

## 🚀 Como Fazer o Deploy para Produção

Para compilar e publicar atualizações no Firebase Hosting:

```bash
npm run build
npx firebase-tools deploy --project organizae-a9590
```

---

## 🔒 Segurança e Privacidade

- **Proteção de Dados**: As regras de segurança do Firestore garantem que cada usuário e grupo acesse exclusivamente os seus próprios registros financeiros.
- **Chave API Segura**: Chaves de API podem ser salvas localmente no navegador (`localStorage`) ou em variáveis de ambiente, nunca sendo expostas em código-fonte aberto.
