---
applyTo: "**/*.ts,**/*.tsx"
---
# Upstash Vector Database

Upstash Vector is a serverless vector database designed for storing and querying high-dimensional vectors with low-latency similarity search. It provides REST API access and SDKs for Python, JavaScript, Go, and PHP, making it ideal for building semantic search, recommendation systems, and RAG (Retrieval-Augmented Generation) applications. The service offers flexible pricing tiers from free to enterprise, with support for up to billions of vectors.

The database supports three index types: dense vectors for semantic similarity search, sparse vectors for exact token matching and full-text search, and hybrid indexes that combine both approaches. Built-in embedding models from providers like BAAI and Mixedbread AI eliminate the need for external embedding services. Features include namespace partitioning, metadata filtering with SQL-like syntax, automatic vector embeddings from raw text, and support for multiple distance metrics (cosine, Euclidean, dot product).

## Upsert Vector

Insert or update vectors in the index with optional metadata and raw data fields.

```bash
curl $UPSTASH_VECTOR_REST_URL/upsert \
  -X POST \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '[
    { "id": "doc-1", "vector": [0.1, 0.2, 0.3, 0.4], "metadata": { "title": "Getting Started", "category": "docs" }, "data": "Introduction to Upstash Vector" },
    { "id": "doc-2", "vector": [0.2, 0.3, 0.4, 0.5], "metadata": { "title": "Advanced Usage", "category": "docs" } }
  ]'
```

```javascript
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Upsert single vector
await index.upsert({
  id: "doc-1",
  vector: [0.1, 0.2, 0.3, 0.4],
  metadata: { title: "Getting Started", category: "docs" },
  data: "Introduction to Upstash Vector"
});

// Upsert multiple vectors
await index.upsert([
  { id: "doc-2", vector: [0.2, 0.3, 0.4, 0.5], metadata: { title: "Advanced Usage" } },
  { id: "doc-3", vector: [0.3, 0.4, 0.5, 0.6], metadata: { title: "API Reference" } }
]);

// Expected response
// "Success"
```

```python
from upstash_vector import Index

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

# Upsert with metadata and data
index.upsert(
    vectors=[
        ("doc-1", [0.1, 0.2, 0.3, 0.4], {"title": "Getting Started", "category": "docs"}),
        ("doc-2", [0.2, 0.3, 0.4, 0.5], {"title": "Advanced Usage", "category": "docs"}),
    ]
)

# Returns: "Success"
```

## Query Vector

Search for similar vectors using approximate nearest neighbor search with optional metadata filtering.

```bash
curl $UPSTASH_VECTOR_REST_URL/query \
  -X POST \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{
    "vector": [0.15, 0.25, 0.35, 0.45],
    "topK": 5,
    "includeMetadata": true,
    "includeVectors": false,
    "includeData": true,
    "filter": "category = \"docs\" AND title != \"API Reference\""
  }'
```

```javascript
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Query with metadata filtering
const results = await index.query({
  vector: [0.15, 0.25, 0.35, 0.45],
  topK: 5,
  includeMetadata: true,
  includeData: true,
  filter: "category = 'docs' AND title != 'API Reference'"
});

// Expected response
// [
//   {
//     id: "doc-1",
//     score: 0.99998,
//     metadata: { title: "Getting Started", category: "docs" },
//     data: "Introduction to Upstash Vector"
//   },
//   {
//     id: "doc-2",
//     score: 0.99985,
//     metadata: { title: "Advanced Usage", category: "docs" }
//   }
// ]

// Batch query
const batchResults = await index.query([
  { vector: [0.1, 0.2, 0.3, 0.4], topK: 3 },
  { vector: [0.2, 0.3, 0.4, 0.5], topK: 3 }
]);
```

```python
from upstash_vector import Index

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

# Query with filtering
results = index.query(
    vector=[0.15, 0.25, 0.35, 0.45],
    top_k=5,
    include_metadata=True,
    include_data=True,
    filter="category = 'docs' AND title != 'API Reference'"
)

for result in results:
    print(f"{result.id}: score={result.score}, title={result.metadata.get('title')}")
```

## Fetch Vector

Retrieve vectors by ID or ID prefix without performing similarity search.

```bash
curl $UPSTASH_VECTOR_REST_URL/fetch \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{
    "ids": ["doc-1", "doc-2", "doc-3"],
    "includeMetadata": true,
    "includeVectors": true,
    "includeData": true
  }'
```

```javascript
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Fetch by IDs
const vectors = await index.fetch(["doc-1", "doc-2"], {
  includeMetadata: true,
  includeVectors: true
});

// Fetch by prefix (returns up to 1000 vectors)
const prefixVectors = await index.fetch({
  prefix: "doc-",
  includeMetadata: true
});

// Expected response
// [
//   {
//     id: "doc-1",
//     vector: [0.1, 0.2, 0.3, 0.4],
//     metadata: { title: "Getting Started", category: "docs" },
//     data: "Introduction to Upstash Vector"
//   },
//   {
//     id: "doc-2",
//     vector: [0.2, 0.3, 0.4, 0.5],
//     metadata: { title: "Advanced Usage", category: "docs" }
//   }
// ]
```

```python
from upstash_vector import Index

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

# Fetch specific vectors
vectors = index.fetch(
    ids=["doc-1", "doc-2"],
    include_metadata=True,
    include_vectors=True
)

# Fetch by prefix
prefix_vectors = index.fetch(
    prefix="doc-",
    include_metadata=True
)
```

## Delete Vector

Remove vectors by ID, ID prefix, or metadata filter.

```bash
# Delete by IDs
curl $UPSTASH_VECTOR_REST_URL/delete \
  -X DELETE \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{ "ids": ["doc-1", "doc-2"] }'

# Delete by prefix
curl $UPSTASH_VECTOR_REST_URL/delete \
  -X DELETE \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{ "prefix": "temp-" }'

# Delete by metadata filter
curl $UPSTASH_VECTOR_REST_URL/delete \
  -X DELETE \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{ "filter": "category = \"archived\" OR status = \"deleted\"" }'
```

```javascript
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Delete specific vectors
const result1 = await index.delete(["doc-1", "doc-2"]);
// Returns: { deleted: 2 }

// Delete by prefix
const result2 = await index.delete({ prefix: "temp-" });
// Returns: { deleted: 15 }

// Delete by metadata filter (full scan operation)
const result3 = await index.delete({
  filter: "category = 'archived' OR status = 'deleted'"
});
// Returns: { deleted: 8 }
```

```python
from upstash_vector import Index

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

# Delete by IDs
deleted = index.delete(ids=["doc-1", "doc-2"])
print(f"Deleted {deleted} vectors")

# Delete by prefix
deleted = index.delete(prefix="temp-")

# Delete by filter
deleted = index.delete(filter="category = 'archived'")
```

## Update Vector

Update vector values, metadata, or raw data for existing vectors.

```bash
curl $UPSTASH_VECTOR_REST_URL/update \
  -X POST \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{
    "id": "doc-1",
    "vector": [0.11, 0.21, 0.31, 0.41],
    "metadata": { "title": "Getting Started Guide", "category": "docs", "updated": true },
    "metadataUpdateMode": "PATCH"
  }'
```

```javascript
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Update vector and metadata (PATCH mode merges with existing)
await index.update({
  id: "doc-1",
  vector: [0.11, 0.21, 0.31, 0.41],
  metadata: { title: "Getting Started Guide", updated: true },
  metadataUpdateMode: "PATCH"
});
// Returns: { updated: 1 }

// Update only metadata (OVERWRITE replaces all)
await index.update({
  id: "doc-2",
  metadata: { title: "New Title", category: "tutorials" },
  metadataUpdateMode: "OVERWRITE"
});

// Update only vector
await index.update({
  id: "doc-3",
  vector: [0.5, 0.6, 0.7, 0.8]
});
```

```python
from upstash_vector import Index

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

# Update with PATCH mode (merges metadata)
index.update(
    id="doc-1",
    vector=[0.11, 0.21, 0.31, 0.41],
    metadata={"title": "Getting Started Guide", "updated": True},
    metadata_update_mode="PATCH"
)

# Update with OVERWRITE mode (replaces metadata)
index.update(
    id="doc-2",
    metadata={"title": "New Title", "category": "tutorials"},
    metadata_update_mode="OVERWRITE"
)
```

## Range Vectors

Iterate through all vectors in the index using cursor-based pagination.

```bash
# First page
curl $UPSTASH_VECTOR_REST_URL/range \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{ "cursor": "0", "limit": 100, "includeMetadata": true }'

# Next page (use nextCursor from previous response)
curl $UPSTASH_VECTOR_REST_URL/range \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{ "cursor": "100", "limit": 100, "includeMetadata": true }'
```

```javascript
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Iterate through all vectors
let cursor = "0";
const allVectors = [];

while (cursor !== "") {
  const result = await index.range({
    cursor,
    limit: 100,
    includeMetadata: true,
    includeData: false
  });

  allVectors.push(...result.vectors);
  cursor = result.nextCursor;
}

console.log(`Total vectors: ${allVectors.length}`);

// Range with prefix filter
const docsVectors = await index.range({
  cursor: "0",
  limit: 50,
  prefix: "doc-",
  includeMetadata: true
});
```

```python
from upstash_vector import Index

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

# Paginate through all vectors
cursor = "0"
all_vectors = []

while cursor:
    result = index.range(
        cursor=cursor,
        limit=100,
        include_metadata=True
    )
    all_vectors.extend(result.vectors)
    cursor = result.next_cursor

print(f"Total vectors: {len(all_vectors)}")
```

## Upsert Raw Text with Embedding Models

Automatically embed raw text using built-in models without manual vectorization.

```bash
curl $UPSTASH_VECTOR_REST_URL/upsert-data \
  -X POST \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '[
    { "id": "text-1", "data": "Upstash is a serverless data platform for Redis and Kafka.", "metadata": { "source": "homepage" } },
    { "id": "text-2", "data": "Vector databases store high-dimensional embeddings for similarity search.", "metadata": { "source": "docs" } }
  ]'
```

```javascript
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Upsert raw text (requires index with embedding model)
await index.upsert([
  {
    id: "text-1",
    data: "Upstash is a serverless data platform for Redis and Kafka.",
    metadata: { source: "homepage", language: "en" }
  },
  {
    id: "text-2",
    data: "Vector databases store high-dimensional embeddings for similarity search.",
    metadata: { source: "docs", language: "en" }
  }
]);

// Query with raw text
const results = await index.query({
  data: "What is Upstash?",
  topK: 3,
  includeMetadata: true,
  includeData: true
});

// Returns text data with results
results.forEach(r => console.log(`${r.id}: ${r.data}`));
```

```python
from upstash_vector import Index

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

# Upsert text data (automatically embedded)
index.upsert(
    vectors=[
        ("text-1", "Upstash is a serverless data platform.", {"source": "homepage"}),
        ("text-2", "Vector databases enable semantic search.", {"source": "docs"}),
    ]
)

# Query with text
results = index.query(
    data="What is Upstash?",
    top_k=3,
    include_data=True,
    include_metadata=True
)

for result in results:
    print(f"{result.id}: {result.data}")
```

## Namespace Operations

Partition a single index into isolated namespaces for multi-tenancy or logical separation.

```bash
# Upsert to namespace
curl $UPSTASH_VECTOR_REST_URL/upsert/customer-123 \
  -X POST \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{ "id": "doc-1", "vector": [0.1, 0.2, 0.3, 0.4] }'

# Query namespace
curl $UPSTASH_VECTOR_REST_URL/query/customer-123 \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{ "vector": [0.1, 0.2, 0.3, 0.4], "topK": 5 }'

# List all namespaces
curl $UPSTASH_VECTOR_REST_URL/list-namespaces \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN"

# Delete namespace
curl $UPSTASH_VECTOR_REST_URL/delete-namespace/customer-123 \
  -X DELETE \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN"
```

```javascript
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Create namespace instance
const customerNamespace = index.namespace("customer-123");

// Upsert to namespace
await customerNamespace.upsert([
  { id: "doc-1", vector: [0.1, 0.2, 0.3, 0.4], metadata: { type: "invoice" } },
  { id: "doc-2", vector: [0.2, 0.3, 0.4, 0.5], metadata: { type: "receipt" } }
]);

// Query within namespace
const results = await customerNamespace.query({
  vector: [0.15, 0.25, 0.35, 0.45],
  topK: 5,
  includeMetadata: true
});

// List all namespaces
const namespaces = await index.listNamespaces();
console.log(namespaces); // ["", "customer-123", "customer-456"]

// Delete namespace
await index.deleteNamespace("customer-123");
```

```python
from upstash_vector import Index

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

# Upsert to specific namespace
index.upsert(
    vectors=[("doc-1", [0.1, 0.2, 0.3, 0.4])],
    namespace="customer-123"
)

# Query namespace
results = index.query(
    vector=[0.15, 0.25, 0.35, 0.45],
    top_k=5,
    namespace="customer-123"
)

# List namespaces
namespaces = index.list_namespaces()
print(namespaces)

# Delete namespace
index.delete_namespace("customer-123")
```

## Sparse Vector Operations

Use sparse vectors for exact token matching, full-text search, and BM25-style retrieval.

```bash
# Upsert sparse vectors
curl $UPSTASH_VECTOR_REST_URL/upsert \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '[
    {"id": "sparse-1", "sparseVector": {"indices": [1, 42, 1523], "values": [0.3, 0.8, 0.5]}},
    {"id": "sparse-2", "sparseVector": {"indices": [5, 100, 2048], "values": [0.6, 0.4, 0.7]}}
  ]'

# Query sparse vectors with IDF weighting
curl $UPSTASH_VECTOR_REST_URL/query \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{"sparseVector": {"indices": [1, 42], "values": [0.5, 0.9]}, "topK": 3, "weightingStrategy": "IDF"}'
```

```javascript
import { Index, WeightingStrategy } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Upsert sparse vectors
await index.upsert([
  {
    id: "sparse-1",
    sparseVector: {
      indices: [1, 42, 1523, 5000],
      values: [0.3, 0.8, 0.5, 0.2]
    }
  }
]);

// Query with sparse vector and IDF weighting
const results = await index.query({
  sparseVector: {
    indices: [1, 42, 100],
    values: [0.5, 0.9, 0.3]
  },
  topK: 5,
  weightingStrategy: WeightingStrategy.IDF,
  includeMetadata: true
});

// Upsert and query text with BM25 model
await index.upsert([
  { id: "text-1", data: "serverless database platform" },
  { id: "text-2", data: "vector similarity search" }
]);

const textResults = await index.query({
  data: "serverless vector database",
  topK: 3,
  weightingStrategy: WeightingStrategy.IDF
});
```

```python
from upstash_vector import Index, Vector
from upstash_vector.types import SparseVector, WeightingStrategy

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

# Upsert sparse vectors
index.upsert(
    vectors=[
        Vector(id="sparse-1", sparse_vector=SparseVector([1, 42, 1523], [0.3, 0.8, 0.5])),
        Vector(id="sparse-2", sparse_vector=SparseVector([5, 100, 2048], [0.6, 0.4, 0.7])),
    ]
)

# Query with IDF weighting
results = index.query(
    sparse_vector=SparseVector([1, 42], [0.5, 0.9]),
    top_k=5,
    weighting_strategy=WeightingStrategy.IDF,
    include_metadata=True
)
```

## Hybrid Index Operations

Combine dense semantic search with sparse keyword matching for optimal retrieval accuracy.

```bash
# Upsert hybrid vectors
curl $UPSTASH_VECTOR_REST_URL/upsert \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '[
    {"id": "hybrid-1", "vector": [0.1, 0.2, 0.3], "sparseVector": {"indices": [10, 25], "values": [0.8, 0.6]}}
  ]'

# Query with RRF fusion
curl $UPSTASH_VECTOR_REST_URL/query \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{"vector": [0.15, 0.25, 0.35], "sparseVector": {"indices": [10], "values": [0.9]}, "topK": 5, "fusionAlgorithm": "RRF"}'

# Query with DBSF fusion
curl $UPSTASH_VECTOR_REST_URL/query \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{"vector": [0.15, 0.25, 0.35], "sparseVector": {"indices": [10], "values": [0.9]}, "fusionAlgorithm": "DBSF"}'
```

```javascript
import { Index, FusionAlgorithm } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Upsert hybrid vectors (both dense and sparse required)
await index.upsert([
  {
    id: "hybrid-1",
    vector: [0.1, 0.2, 0.3, 0.4],
    sparseVector: {
      indices: [10, 25, 150],
      values: [0.8, 0.6, 0.4]
    },
    metadata: { title: "Hybrid Document" }
  }
]);

// Query with RRF (Reciprocal Rank Fusion) - default
const rrfResults = await index.query({
  vector: [0.15, 0.25, 0.35, 0.45],
  sparseVector: { indices: [10, 25], values: [0.9, 0.7] },
  topK: 5,
  fusionAlgorithm: FusionAlgorithm.RRF,
  includeMetadata: true
});

// Query with DBSF (Distribution-Based Score Fusion)
const dbsfResults = await index.query({
  vector: [0.15, 0.25, 0.35, 0.45],
  sparseVector: { indices: [10, 25], values: [0.9, 0.7] },
  fusionAlgorithm: FusionAlgorithm.DBSF
});

// Query only dense component for custom reranking
const denseResults = await index.query({ vector: [0.15, 0.25, 0.35, 0.45] });
const sparseResults = await index.query({
  sparseVector: { indices: [10, 25], values: [0.9, 0.7] }
});
// Custom rerank logic here
```

```python
from upstash_vector import Index, Vector
from upstash_vector.types import SparseVector, FusionAlgorithm

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

# Upsert hybrid vectors
index.upsert(
    vectors=[
        Vector(
            id="hybrid-1",
            vector=[0.1, 0.2, 0.3, 0.4],
            sparse_vector=SparseVector([10, 25, 150], [0.8, 0.6, 0.4]),
            metadata={"title": "Hybrid Document"}
        )
    ]
)

# Query with RRF
results_rrf = index.query(
    vector=[0.15, 0.25, 0.35, 0.45],
    sparse_vector=SparseVector([10, 25], [0.9, 0.7]),
    top_k=5,
    fusion_algorithm=FusionAlgorithm.RRF,
    include_metadata=True
)

# Query with DBSF
results_dbsf = index.query(
    vector=[0.15, 0.25, 0.35, 0.45],
    sparse_vector=SparseVector([10, 25], [0.9, 0.7]),
    fusion_algorithm=FusionAlgorithm.DBSF
)
```

## Metadata Filtering

Filter query results using SQL-like expressions on metadata fields with support for nested objects and arrays.

```bash
curl $UPSTASH_VECTOR_REST_URL/query \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN" \
  -d '{
    "vector": [0.1, 0.2, 0.3, 0.4],
    "topK": 10,
    "filter": "category = \"docs\" AND (priority >= 8 OR status IN (\"published\", \"reviewed\")) AND tags CONTAINS \"important\" AND author.name GLOB \"John*\"",
    "includeMetadata": true
  }'
```

```javascript
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Complex metadata filter
const results = await index.query({
  vector: [0.1, 0.2, 0.3, 0.4],
  topK: 10,
  filter: `
    category = 'docs' AND
    priority >= 8 AND
    status IN ('published', 'reviewed') AND
    tags CONTAINS 'important' AND
    author.name GLOB 'John*' AND
    metadata.created_at > 1640000000 AND
    HAS FIELD updated_at
  `,
  includeMetadata: true
});

// Numeric comparisons
const numericFilter = await index.query({
  vector: [0.1, 0.2, 0.3, 0.4],
  filter: "price < 100 AND rating >= 4.5 AND stock != 0"
});

// Array and nested object filtering
const complexFilter = await index.query({
  vector: [0.1, 0.2, 0.3, 0.4],
  filter: `
    colors CONTAINS 'red' AND
    colors[0] = 'blue' AND
    dimensions.width >= 10 AND
    supplier.location.country = 'USA'
  `
});

// Glob patterns for string matching
const globFilter = await index.query({
  vector: [0.1, 0.2, 0.3, 0.4],
  filter: "email GLOB '*@upstash.com' AND name NOT GLOB 'test*'"
});
```

```python
from upstash_vector import Index

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

# Complex filter with multiple conditions
results = index.query(
    vector=[0.1, 0.2, 0.3, 0.4],
    top_k=10,
    filter="""
        category = 'docs' AND
        priority >= 8 AND
        status IN ('published', 'reviewed') AND
        tags CONTAINS 'important' AND
        author.name GLOB 'John*'
    """,
    include_metadata=True
)

# Delete with metadata filter
deleted_count = index.delete(
    filter="status = 'archived' OR last_accessed < 1640000000"
)
```

## Index Information

Retrieve index configuration, statistics, and namespace information.

```bash
curl $UPSTASH_VECTOR_REST_URL/info \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN"
```

```javascript
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

const info = await index.info();

console.log(`Total vectors: ${info.vectorCount}`);
console.log(`Pending vectors: ${info.pendingVectorCount}`);
console.log(`Index size: ${info.indexSize} bytes`);
console.log(`Dimension: ${info.dimension}`);
console.log(`Similarity function: ${info.similarityFunction}`);
console.log(`Index type: ${info.indexType}`);

if (info.denseIndex) {
  console.log(`Dense model: ${info.denseIndex.embeddingModel}`);
}

if (info.sparseIndex) {
  console.log(`Sparse model: ${info.sparseIndex.embeddingModel}`);
}

// Namespace statistics
Object.entries(info.namespaces).forEach(([name, stats]) => {
  console.log(`Namespace "${name}": ${stats.vectorCount} vectors`);
});
```

```python
from upstash_vector import Index

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

info = index.info()

print(f"Total vectors: {info.vector_count}")
print(f"Index size: {info.index_size} bytes")
print(f"Dimension: {info.dimension}")
print(f"Similarity: {info.similarity_function}")
print(f"Type: {info.index_type}")

# Namespace info
for namespace, stats in info.namespaces.items():
    print(f"Namespace '{namespace}': {stats['vectorCount']} vectors")
```

## Summary

Upstash Vector is primarily used for building semantic search systems over documents, images, or any high-dimensional data where similarity matching is required. Common applications include recommendation engines, duplicate detection, question-answering systems, and retrieval-augmented generation (RAG) pipelines for large language models. The database's serverless architecture eliminates infrastructure management while providing automatic scaling and pay-per-use pricing. Hybrid indexes enable sophisticated retrieval strategies that combine semantic understanding with exact keyword matching, improving relevance in production search applications.

Integration patterns include using SDKs for application-level queries, REST API for language-agnostic access, and namespace isolation for multi-tenant SaaS applications. The built-in embedding models reduce latency and complexity by eliminating external API calls for vectorization. Metadata filtering enables combining vector similarity with structured data constraints, making it suitable for filtered semantic search across large document collections. The range API supports batch processing and full index traversal for analytics or migration workflows.