You are building a **context graph system with an LLM-powered query interface**. At a high level:

* The dataset is converted into a **graph of interconnected entities**
* This graph is **visualized in a UI**
* A **chat interface sits alongside the graph**
* The user asks questions in natural language
* The system translates those questions into **structured queries (such as SQL) dynamically**
* The system executes those queries and returns **data-backed answers in natural language**

This is not a static Q\&A system. The LLM should interpret user queries, generate structured queries dynamically, and return data-backed answers.

### Phase 1 - Analysis \& Preprocessing

This is an Order to cash dataset with some tables related and some independent. Here is a brief about the datatset:

### Core Flow

* Orders
* Deliveries
* Invoices
* Payments

### Supporting Entities

* Customers
* Products

  * Address

preprocess, normalize, or restructure the dataset as required. Fill empty tuples with mode data.

### Phase 2 — ER relationship pinpointing

You must estimate:

* business entities
* relationships between entities which satisfies the maximum logical sense.

Note identified relationships as contextual jsons for LLMs that will query this data.

Also make a .md and a json containing the relationships that you estimated. Markdown is for my reference and json is the contextual reference for the LLM querying this data.

### Phase 3 — Migration

write a docker-compose file to setup neo4j and a python script to populate these changes to the graph database. I will run both manually.

### Phase 4 — LLM Training

I have some entities related to each other, or inependent in neo4j, I want you to train a LLM to interact with the user to answer queries using this data as context.

The LLM should be capable of answering questions such as:

a. Which products are associated with the highest number of billing documents?

b. Trace the full flow of a given billing document (Sales Order → Delivery → Billing → Journal Entry)

c. Identify sales orders that have broken or incomplete flows (e.g. delivered but not billed, billed without delivery)

You are encouraged to go beyond these examples and explore additional meaningful queries based on your understanding of the dataset.

Guardrails --
The system must restrict queries to the dataset and domain.

It should appropriately handle or reject unrelated prompts such as:

* General knowledge questions
* Creative writing requests
* Irrelevant topics

Example response:

"This system is designed to answer questions related to the provided dataset only."

This is an important evaluation criterion.

Several providers offer free access with reasonable limits. Choose the best that fits our usecase.

You don’t need to spend money on this.

Several providers offer free access with reasonable limits.

Query Translation Pipeline:

1. Classify whether the prompt is in-domain.
2. Try to match a deterministic query template.
3. Decide what to query by using:

   1. a data dictionary that tells wbout what data lies in what table
   2. an ER-Relation document to know how entites are related
   3. A schema document having schema of all tables to avoid validation errors
4. Build a natural-language answer only from returned rows.
5. Return the answer, SQL, preview rows, and related graph node IDs.

