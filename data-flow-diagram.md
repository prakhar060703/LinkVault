# Data Flow Diagram (High-Level Architecture)

## Upload to DB Storage Flow
```mermaid
flowchart LR
    U[User]
    FE[Frontend React App\nUpload Form]
    API[Express API\nPOST /api/shares]
    AUTH[JWT Auth Middleware]
    VAL[Validation Layer\ntext/file XOR, expiry, limits]
    MUL[Multer\nFile Parser + Disk Storage]
    SEC[Security Layer\nPassword hash with scrypt\nToken generation]
    FS[(Local File Storage\nbackend/uploads)]
    MDB[(MongoDB\nshares collection)]

    U --> FE
    FE -->|multipart/form-data + Bearer token| API
    API --> AUTH
    AUTH --> VAL
    VAL -->|file mode| MUL
    MUL --> FS
    VAL --> SEC
    SEC --> MDB
    MUL -->|file metadata| MDB
```

## End-to-End High-Level Flow
```mermaid
flowchart TD
    A[Sender logs in] --> B[Create Share: text or file]
    B --> C{Content Type}

    C -->|Text| D[Validate + Hash Optional Password + Generate Token]
    C -->|File| E[Multer stores file in backend/uploads]
    E --> F[Collect metadata: name, type, size, path]

    D --> G[Store share document in MongoDB]
    F --> G

    G --> H[Return token + share URL to sender]

    I[Recipient opens /share/:token] --> J[GET /api/shares/:token]
    J --> K{Checks}
    K -->|expired / limit reached| L[Reject]
    K -->|password required| M[Prompt password]
    K -->|ok| N[Return text OR file metadata]

    N --> O{If file}
    O -->|Download| P[GET /api/shares/:token/download]
    P --> Q[Increment downloadCount]
    J --> R[Increment viewCount for text]

    S[Background Cleanup Job] --> T[Find expired shares]
    T --> U[Delete expired files from disk]
    T --> V[Delete expired records from MongoDB]
```

## Quick 
- Frontend: React + Vite
- API: Node.js + Express
- Upload parsing: Multer
- DB: MongoDB (via Mongoose)
- File store: local disk (`backend/uploads`)
- Auth: JWT bearer token
