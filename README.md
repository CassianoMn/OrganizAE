# OrganizAE 📊💰

**OrganizAE** é um sistema completo de gestão financeira pessoal e familiar desenvolvido em React, TypeScript, Tailwind CSS, Firebase e Inteligência Artificial (Google Gemini 2.5 Flash).

---

## 🚀 Funcionalidades

- **📊 Visão Geral & Orçamento (Dashboard)**
  - Acompanhamento do Saldo Inicial, Saldo Final e Economia do período.
  - Orçamentos planejados vs. despesas/rendas reais por categoria.
  - Gráficos visuais com Recharts para visualização instantânea da saúde financeira.
  - Filtros por período (Mês específico, Trimestre, Semestre ou Todo o período).

- **🧾 Gestão de Transações**
  - Registro de Despesas e Rendas com categorias personalizadas.
  - **Importação com IA (Gemini 2.5 Flash)**: Faça upload da foto de extratos ou notas fiscais e a IA extrai automaticamente as transações, valores, categorias e datas.

- **🛒 Módulo de Mercado**
  - Controle detalhado de compras de supermercado com cálculo de itens e distribuição por categorias (Lanche, Proteína, Limpeza, etc.).
  - **Leitura Inteligente de Nota Fiscal**: Envie a foto da nota fiscal do supermercado e a IA adiciona os itens e o total de despesa automaticamente.

- **🔐 Autenticação e Segurança**
  - Login seguro com Google via **Firebase Authentication**.
  - Regras de segurança no servidor (**Firestore Security Rules**) com isolamento de dados por usuário e suporte a grupos de finanças compartilhadas.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts.
- **Backend & Banco de Dados**: Firebase Firestore & Firebase Auth.
- **Inteligência Artificial**: Google GenAI SDK (`@google/genai` - Gemini 2.5 Flash).

---

## 📦 Como Rodar o Projeto

### Pré-requisitos
- Node.js instalado (versão 18+)

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/CassianoMn/OrganizAE.git
   cd OrganizAE
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Configurar as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto contendo sua chave da API do Gemini:
   ```env
   GEMINI_API_KEY="SUA_CHAVE_API_GEMINI"
   ```

4. **Iniciar o Servidor Local:**
   ```bash
   npm run dev
   ```
   Acesse a aplicação no navegador em `http://localhost:3000`.

---

## 🔒 Segurança e Boas Práticas

- **Proteção de Dados**: As regras de segurança do Firestore garantem que apenas usuários autenticados e autorizados possam ler e alterar seus próprios dados.
- **Segredos Protegidos**: Chaves de API privadas não são enviadas ao repositório via `.gitignore`.
