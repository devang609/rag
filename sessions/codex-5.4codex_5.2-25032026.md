Erase and re-write the #file:llm\_query\_engine.py from scratch.

Use the knowledge of all the deocuments for decision making

Step 1 - is query out of context(reject) or in context(answer)

Step 2 - What entity is being asked about

Step 3 - Where is that entity #file:DATA\_DICTIONARY.json

Step 4 - any other related entities/tables required #file:ER\_RELATIONSHIPS.json

Step 5 - tables pinpointed

Step 5 - Draft a dynamic graphDB query to mine required data from inpointed tables nd answer the user in minimum tokens.

I dont want the LLM to save these files in memory, I want it to refer to these and only the required part when required. For example if a user asks for a plant, refer to #file:DATA\_DICTIONARY.json and to find related entitites to query look up in #file:ER\_RELATIONSHIPS.json and then use #file:queries\_guide.json to build a dynamic query

\## codex-5.4codex/5.2-25032026



In this assignment, you will unify this fragmented data into a graph and build a system that allows users to explore and query these relationships using natural language.

\## What You Are Building



You are building a \*\*context graph system with an LLM-powered query interface\*\*.



At a high level:



\- The dataset is converted into a \*\*graph of interconnected entities\*\*

\- This graph is \*\*visualized in a UI\*\*

\- A \*\*chat interface sits alongside the graph\*\*

\- The user asks questions in natural language

\- The system translates those questions into \*\*structured queries (such as SQL) dynamically\*\*

\- The system executes those queries and returns \*\*data-backed answers in natural language\*\*



This is not a static Q\&A system. The LLM should interpret user queries, generate structured queries dynamically, and return data-backed answers.

The dataset includes entities such as:



\### Core Flow



\- Orders

\- Deliveries

\- Invoices

\- Payments



\### Supporting Entities



\- Customers

\- Products

\- Address



You are free to preprocess, normalize, or restructure the dataset as required.

The dataset includes entities such as:



\### Core Flow



\- Orders

\- Deliveries

\- Invoices

\- Payments



\### Supporting Entities



\- Customers

\- Products

\- Address



You are free to preprocess, normalize, or restructure the dataset as required.



\---



\## Functional Requirements



\### 1. Graph Construction



Ingest the dataset and construct a graph representation.



You must define:



\- Nodes representing business entities

\- Edges representing relationships between entities

Examples of relationships:



\- Purchase Order → Purchase Order Item

\- Delivery → Plant

\- Purchase Order Item → Material

\- Customer → Delivery



The focus is on how you model the system, not just loading data.



\---



\### 2. Graph Visualization



Build an interface that allows users to explore the graph.



The interface should support:



\- Expanding nodes

\- Inspecting node metadata

\- Viewing relationships between entities



A simple and clean implementation is sufficient.



You may use any visualization library of your choice.

\### 3. Conversational Query Interface



Build a chat interface that allows users to query the system.



The system should:



\- Accept natural language queries

\- Translate queries into structured operations on the graph or underlying data

\- Return accurate and relevant responses



The responses must be grounded in the dataset and not generated without data backing.



\---



\### 4. Example Queries



Your system should be capable of answering questions such as:



a. Which products are associated with the highest number of billing documents?



b. Trace the full flow of a given billing document (Sales Order → Delivery → Billing → Journal Entry)



c. Identify sales orders that have broken or incomplete flows (e.g. delivered but not billed, billed without delivery)



You are encouraged to go beyond these examples and explore additional meaningful queries based on your understanding of the dataset.

\### 5. Guardrails



The system must restrict queries to the dataset and domain.



It should appropriately handle or reject unrelated prompts such as:



\- General knowledge questions

\- Creative writing requests

\- Irrelevant topics



Example response:



"This system is designed to answer questions related to the provided dataset only."



This is an important evaluation criterion.

\# \*\*LLM APIs : Use Free Tiers\*\*



You don’t need to spend money on this.



Several providers offer free access with reasonable limits.



\---



I dont have Postgres installed, write a docker-compose for it and all the softwares except node, java, python(if any of these are being used)



\---



npm run ingest

PS C:\\Users\\admin\\Desktop\\assignment> npm run ingest



> o2c-context-graph@0.1.0 ingest

tsx scripts/ingest-sap-jsonl.ts

> 



Error: DATABASE\_URL is required to run the ingest script.

at main (C:\\Users\\admin\\Desktop\\assignment\\scripts\\ingest-sap-jsonl.ts:9:11)

at <anonymous> (C:\\Users\\admin\\Desktop\\assignment\\scripts\\ingest-sap-jsonl.ts:20:1)

at ModuleJob.run (node:internal/modules/esm/module\_job:271:25)

at async onImport.tracePromise.\*\*proto\*\* (node:internal/modules/esm/loader:547:26)

at async asyncRunEntryPointWithESMLoader (node:internal/modules/run\_main:116:5)



/divider



What percentage of customers are currently blocked?

0.00000000000000000000% of customers are currently blocked.



expected - 75%

why?

total - 8

blocked - 6

"blocked\_customer\_ids": \["320000082", "320000083", "320000085", "320000088", "320000107", "320000108"],

"active\_customer\_ids": \["310000108", "310000109"]



\---



explain the approach you  are using to tranlate NL user queries to DB Queries



\---



Are you using a similar or better approach:

Query Translation Pipeline:



1\. Classify whether the prompt is in-domain.

2\. Try to match a deterministic query template.

3\. Decide what to query by using:

&#x20;   1. a data dictionary that tells wbout what data lies in what table

&#x20;   2. an ER-Relation document to know how entites are related

&#x20;   3. A schema document having schema of all tables to avoid validation errors

4\. Build a natural-language answer only from returned rows.

5\. Return the answer, SQL, preview rows, and related graph node IDs.



Feel free to discard mine if u have a better approach in place



\---



When I travel far from entity graph, I loose the entities and not able to get back to it. Can u either lock the graph to the canvas div so I cant scroll too far, or a reload button that re-renders the canvas so Im back again at the graph. Do whichever is too expensive(re-rendering the entity graph can be expensive?)



\---



Prepare a document with every tiny detail about this project, I want to give demo of this project, make it in a markdown



\---



Make a README for the Repo and add the folllowing:

Tech Stack (Which tech does what - React for freontend, Postgres for DB......)

Query Translation Pipeline logic

LLM Data seeding starategy etc.



Remove all unecessary files for prod and do a final test for prod.



\---



Add answers to these to the README:



\## Evaluation Criteria



Area	 | What We Are Evaluating

Code quality and architecture | 	Structure, readability, and maintainability

Graph modelling	| Quality and clarity of entities and relationships

Database / storage choice	| Architectural decisions and tradeoffs

LLM integration and prompting	| How natural language is translated into useful queries

Guardrails	| Ability to restrict misuse and off-topic prompts



\---



I want to deploy it so that the evaluator can view it, guide me thru and prepare the project for production (Not a very stress-bearing system that is hit with many APIs per second, not made to handle very heavy user load, but should be scalable for the latter). Mention current choices and future choices for scalability in README as well.



\---

