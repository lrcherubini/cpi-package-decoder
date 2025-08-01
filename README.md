# SAP CPI Package Decoder 🔓

Uma ferramenta web para decodificar e visualizar o conteúdo de pacotes exportados do SAP Cloud Platform Integration (CPI).

Disponível também em [English](README.en-US.md) e [Español](README.es-ES.md).

## 📋 Visão Geral

O SAP CPI Package Decoder é uma aplicação web client-side que permite aos desenvolvedores e administradores SAP CPI visualizar e examinar o conteúdo de pacotes de integração exportados, incluindo scripts, metadados e recursos sem a necessidade de ferramentas externas.

## ✨ Funcionalidades

- **Decodificação automática**: Processa arquivos `.zip` exportados do SAP CPI
- **Visualização de metadados**: Exibe informações detalhadas do pacote (`contentmetadata.md`)
- **Exploração de recursos**: Lista e permite visualizar todos os recursos do pacote (`resources.cnt`)
- **Visualização de scripts**: Suporte para ScriptCollections e scripts individuais (Groovy, JavaScript, etc.)
- **Visualização de BPMN**: Botão para exibir arquivos `.iflw` como diagramas BPMN
- **Suporte a artefatos de iFlow**: Permite carregar arquivos ZIP exportados diretamente de um iFlow
- **Interface intuitiva**: Drag & drop ou seleção de arquivos
- **Processamento local**: Toda a decodificação acontece no navegador (sem upload para servidores)

## 🚀 Como Usar

1. **Exporte o pacote do SAP CPI**:
   - No SAP CPI Web UI, vá para o seu pacote de integração
   - Clique em "Actions" → "Export"
   - Baixe o arquivo `.zip` resultante
   - Também é possível exportar individualmente um iFlow (ZIP) e carregá-lo

2. **Carregue o arquivo na ferramenta**:
   - Abra o `index.html` no seu navegador
   - Arraste o arquivo `.zip` para a área de upload OU
   - Clique em "Selecionar Arquivo ZIP" e escolha o arquivo

3. **Explore o conteúdo**:
   - Visualize os metadados do pacote
   - Clique em qualquer recurso na lista para ver seu conteúdo
   - Scripts e ScriptCollections serão automaticamente decodificados

## 📁 Estrutura do Projeto

```
sap-cpi-decoder/
├── index.html              # Página principal da aplicação
├── css/
│   └── style.css           # Estilos da interface
├── js/
│   ├── globals.js         # Variáveis e configuração geral
│   ├── editor.js          # Funções do Monaco Editor
│   ├── fileLoader.js      # Processamento de ZIP e recursos
│   └── uiHandlers.js      # Eventos da interface
├── lib/
│   └── jszip.min.js        # Biblioteca para processamento de ZIP
├── .vscode/
│   └── launch.json         # Configuração de debug do VS Code
├── .gitattributes          # Configurações do Git
└── README.md               # Esta documentação
```

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura da aplicação
- **CSS3**: Interface moderna com gradientes e animações
- **JavaScript (ES6+)**: Lógica de processamento
- **JSZip**: Biblioteca para manipulação de arquivos ZIP
- **FileReader API**: Leitura de arquivos locais
- **Base64 Decoding**: Decodificação de conteúdo codificado

## 🔧 Configuração de Desenvolvimento

### Pré-requisitos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Editor de código (recomendado: VS Code)

### Executando Localmente

1. **Clone ou baixe o projeto**
2. **Abra no VS Code** (opcional)
3. **Execute um dos métodos**:
   - **Método 1**: Abra `index.html` diretamente no navegador
   - **Método 2**: Use a extensão Live Server do VS Code
   - **Método 3**: Use o debug configurado (F5 no VS Code)

### Debug no VS Code

O projeto inclui configuração de debug (`.vscode/launch.json`):
- Pressione `F5` para iniciar o debug
- Ou vá em "Run and Debug" → "Depurar no Navegador"

## 📦 Arquivos Processados

A ferramenta processa os seguintes arquivos do pacote SAP CPI:

| Arquivo | Descrição | Formato |
|---------|-----------|---------|
| `contentmetadata.md` | Metadados do pacote | Base64 → Text |
| `resources.cnt` | Lista de recursos | Base64 → JSON |
| `{resourceId}_content` | Conteúdo dos recursos | Binary/ZIP → Text/Scripts |
| `IFlow.zip` | Artefato iFlow exportado | ZIP → Text/BPMN |

## 🔍 Tipos de Recursos Suportados

- **ScriptCollection**: Coleções de scripts (ZIP interno)
- **Groovy Scripts**: Scripts Groovy individuais
- **JavaScript**: Scripts JavaScript
- **XML**: Configurações e mapeamentos
- **Properties**: Arquivos de propriedades
- **Outros**: Arquivos de texto em geral

## 🎨 Interface

A aplicação possui uma interface moderna e responsiva com:
- **Gradientes**: Design visual atraente
- **Drag & Drop**: Área interativa para upload
- **Animações**: Feedback visual suave
- **Responsividade**: Funciona em diferentes tamanhos de tela
- **Código destacado**: Syntax highlighting para melhor legibilidade

## 🔒 Segurança e Privacidade

- **Processamento local**: Nenhum arquivo é enviado para servidores externos
- **Client-side only**: Toda a decodificação acontece no navegador
- **Sem dependências externas**: Apenas bibliotecas locais
- **Código aberto**: Totalmente auditável

## 🐛 Solução de Problemas

### Arquivo não carrega
- Verifique se é um arquivo `.zip` válido do SAP CPI
- Certifique-se de que o arquivo não está corrompido

### Erro de decodificação
- Alguns recursos podem não ser suportados
- Verifique o console do navegador para detalhes do erro

### Interface não carrega
- Verifique se todos os arquivos estão no local correto
- Certifique-se de que o JavaScript está habilitado

## 🤝 Contribuições

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é de código aberto. Consulte o arquivo LICENSE para detalhes.

## 🆘 Suporte

Para problemas ou dúvidas:
- Abra uma issue no repositório
- Verifique a documentação do SAP CPI
- Consulte a seção de solução de problemas acima

## 🙏 Agradecimentos

- Comunidade open source pela biblioteca JSZip
- Desenvolvedores que contribuíram com feedback e melhorias
