Graph-Based Data Modeling and Query System

#### Overview

In real-world business systems, data is spread across multiple tables : orders, deliveries, invoices, and payments, without a clear way to trace how they connect.

In this assignment, you will unify this fragmented data into a graph and build a system that allows users to explore and query these relationships using natural language.

What You Are Building
You are building a context graph system with an LLM-powered query interface. Below is a sample interface for reference:Graph-Based Data Modeling and Query System

At a high level:

The dataset is converted into a graph of interconnected entities
This graph is visualized in a UI
A chat interface sits alongside the graph
The user asks questions in natural language
The system translates those questions into structured queries (such as SQL) dynamically
The system executes those queries and returns data-backed answers in natural language
This is not a static Q\&A system. The LLM should interpret user queries, generate structured queries dynamically, and return data-backed answers.

The dataset includes entities such as:

Core Flow
Orders
Deliveries
Invoices
Payments
Supporting Entities
Customers
Products
Address
You are free to preprocess, normalize, or restructure the dataset as required.

Functional Requirements

Graph Construction
Ingest the dataset and construct a graph representation.
You must define:

Nodes representing business entities
Edges representing relationships between entities
Examples of relationships:

Purchase Order → Purchase Order Item
Delivery → Plant
Purchase Order Item → Material
Customer → Delivery
The focus is on how you model the system, not just loading data.

Graph Visualization
Build an interface that allows users to explore the graph.
The interface should support:

Expanding nodes
Inspecting node metadata
Viewing relationships between entities
A simple and clean implementation is sufficient.

You may use any visualization library of your choice.

Conversational Query Interface
Build a chat interface that allows users to query the system.
The system should:

Accept natural language queries
Translate queries into structured operations on the graph or underlying data
Return accurate and relevant responses
The responses must be grounded in the dataset and not generated without data backing.

Example Queries
Your system should be capable of answering questions such as:
a. Which products are associated with the highest number of billing documents?

b. Trace the full flow of a given billing document (Sales Order → Delivery → Billing → Journal Entry)

c. Identify sales orders that have broken or incomplete flows (e.g. delivered but not billed, billed without delivery)

You are encouraged to go beyond these examples and explore additional meaningful queries based on your understanding of the dataset.

Guardrails
The system must restrict queries to the dataset and domain.
It should appropriately handle or reject unrelated prompts such as:

General knowledge questions
Creative writing requests
Irrelevant topics
Example response:

"This system is designed to answer questions related to the provided dataset only."

This is an important evaluation criterion.

Several providers offer free access with reasonable limits. So use their APIs dont try to locally run models.

Add things u wanna run in the docker-compose.yml for s/w I will need to install.

