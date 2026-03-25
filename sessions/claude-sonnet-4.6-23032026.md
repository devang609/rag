python ingest\_to\_neo4j.py



```shell
2026-03-23 19:58:19,810 - ERROR - Error during ingestion: {code: Neo.ClientError.Statement.SyntaxError} {message: Type mismatch: r defined with conflicting type Relationship (expected Node) (line 9, column 16 (offset: 355))
" MERGE (r)-\\\[:THROUGH\\\_CHANNEL]->(dc)"
^}
Traceback (most recent call last):
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 742, in main
loader.run\\\_full\\\_ingestion(DATA\\\_DIR, clear\\\_db=CLEAR\\\_DB)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 664, in run\\\_full\\\_ingestion
self.load\\\_customer\\\_sales\\\_area\\\_assignments(data\\\_path)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 195, in load\\\_customer\\\_sales\\\_area\\\_assignments
self.batch\\\_execute(query, data, description="Loading Customer-Sales Area Assignments")
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 98, in batch\\\_execute
session.run(query, {"batch": batch})
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\work\\\\\\\[session.py](http://session.py/)", line 313, in run
self.\\\_auto\\\_result.\\\_run(
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\work\\\\\\\[result.py](http://result.py/)", line 181, in \\\_run
self.\\\_attach()
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\work\\\\\\\[result.py](http://result.py/)", line 298, in \\\_attach
self.\\\_connection.fetch\\\_message()
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_common.py", line 178, in inner
func(\\\*args, \\\*\\\*kwargs)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_bolt.py", line 849, in fetch\\\_message
res = self.\\\_process\\\_message(tag, fields)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_bolt5.py", line 374, in \\\_process\\\_message
response.on\\\_failure(summary\\\_metadata or {})
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_common.py", line 245, in on\\\_failure
raise Neo4jError.hydrate(\\\*\\\*metadata)
neo4j.exceptions.CypherSyntaxError: {code: Neo.ClientError.Statement.SyntaxError} {message: Type mismatch: r defined with conflicting type Relationship (expected Node) (line 9, column 16 (offset: 355))
" MERGE (r)-\\\[:THROUGH\\\_CHANNEL]->(dc)"
^}
2026-03-23 19:58:19,821 - INFO - Neo4j connection closed
Traceback (most recent call last):
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 752, in <module>
main()
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 742, in main
loader.run\\\_full\\\_ingestion(DATA\\\_DIR, clear\\\_db=CLEAR\\\_DB)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 664, in run\\\_full\\\_ingestion
self.load\\\_customer\\\_sales\\\_area\\\_assignments(data\\\_path)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 195, in load\\\_customer\\\_sales\\\_area\\\_assignments
self.batch\\\_execute(query, data, description="Loading Customer-Sales Area Assignments")
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 98, in batch\\\_execute
session.run(query, {"batch": batch})
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\work\\\\\\\[session.py](http://session.py/)", line 313, in run
self.\\\_auto\\\_result.\\\_run(
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\work\\\\\\\[result.py](http://result.py/)", line 181, in \\\_run
self.\\\_attach()
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\work\\\\\\\[result.py](http://result.py/)", line 298, in \\\_attach
self.\\\_connection.fetch\\\_message()
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_common.py", line 178, in inner
func(\\\*args, \\\*\\\*kwargs)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_bolt.py", line 849, in fetch\\\_message
res = self.\\\_process\\\_message(tag, fields)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_bolt5.py", line 374, in \\\_process\\\_message
response.on\\\_failure(summary\\\_metadata or {})
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_common.py", line 245, in on\\\_failure
raise Neo4jError.hydrate(\\\*\\\*metadata)
neo4j.exceptions.CypherSyntaxError: {code: Neo.ClientError.Statement.SyntaxError} {message: Type mismatch: r defined with conflicting type Relationship (expected Node) (line 9, column 16 (offset: 355))
" MERGE (r)-\\\[:THROUGH\\\_CHANNEL]->(dc)"
^}

python ingest\\\_to\\\_neo4j.py

2026-03-23 19:58:19,810 - ERROR - Error during ingestion: {code: Neo.ClientError.Statement.SyntaxError} {message: Type mismatch: r defined with conflicting type Relationship (expected Node) (line 9, column 16 (offset: 355))
" MERGE (r)-\\\[:THROUGH\\\_CHANNEL]->(dc)"
^}
Traceback (most recent call last):
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 742, in main
loader.run\\\_full\\\_ingestion(DATA\\\_DIR, clear\\\_db=CLEAR\\\_DB)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 664, in run\\\_full\\\_ingestion
self.load\\\_customer\\\_sales\\\_area\\\_assignments(data\\\_path)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 195, in load\\\_customer\\\_sales\\\_area\\\_assignments
self.batch\\\_execute(query, data, description="Loading Customer-Sales Area Assignments")
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 98, in batch\\\_execute
session.run(query, {"batch": batch})
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\work\\\\\\\[session.py](http://session.py/)", line 313, in run
self.\\\_auto\\\_result.\\\_run(
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\work\\\\\\\[result.py](http://result.py/)", line 181, in \\\_run
self.\\\_attach()
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\work\\\\\\\[result.py](http://result.py/)", line 298, in \\\_attach
self.\\\_connection.fetch\\\_message()
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_common.py", line 178, in inner
func(\\\*args, \\\*\\\*kwargs)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_bolt.py", line 849, in fetch\\\_message
res = self.\\\_process\\\_message(tag, fields)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_bolt5.py", line 374, in \\\_process\\\_message
response.on\\\_failure(summary\\\_metadata or {})
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_common.py", line 245, in on\\\_failure
raise Neo4jError.hydrate(\\\*\\\*metadata)
neo4j.exceptions.CypherSyntaxError: {code: Neo.ClientError.Statement.SyntaxError} {message: Type mismatch: r defined with conflicting type Relationship (expected Node) (line 9, column 16 (offset: 355))
" MERGE (r)-\\\[:THROUGH\\\_CHANNEL]->(dc)"
^}
2026-03-23 19:58:19,821 - INFO - Neo4j connection closed
Traceback (most recent call last):
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 752, in <module>
main()
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 742, in main
loader.run\\\_full\\\_ingestion(DATA\\\_DIR, clear\\\_db=CLEAR\\\_DB)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 664, in run\\\_full\\\_ingestion
self.load\\\_customer\\\_sales\\\_area\\\_assignments(data\\\_path)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 195, in load\\\_customer\\\_sales\\\_area\\\_assignments
self.batch\\\_execute(query, data, description="Loading Customer-Sales Area Assignments")
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self\\\\ingest\\\_to\\\_neo4j.py", line 98, in batch\\\_execute
session.run(query, {"batch": batch})
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\work\\\\\\\[session.py](http://session.py/)", line 313, in run
self.\\\_auto\\\_result.\\\_run(
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\work\\\\\\\[result.py](http://result.py/)", line 181, in \\\_run
self.\\\_attach()
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\work\\\\\\\[result.py](http://result.py/)", line 298, in \\\_attach
self.\\\_connection.fetch\\\_message()
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_common.py", line 178, in inner
func(\\\*args, \\\*\\\*kwargs)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_bolt.py", line 849, in fetch\\\_message
res = self.\\\_process\\\_message(tag, fields)
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_bolt5.py", line 374, in \\\_process\\\_message
response.on\\\_failure(summary\\\_metadata or {})
File "C:\\\\Users\\\\admin\\\\Desktop\\\\Assignment-Self.venv\\\\lib\\\\site-packages\\\\neo4j\\\_sync\\\\io\\\_common.py", line 245, in on\\\_failure
raise Neo4jError.hydrate(\\\*\\\*metadata)
neo4j.exceptions.CypherSyntaxError: {code: Neo.ClientError.Statement.SyntaxError} {message: Type mismatch: r defined with conflicting type Relationship (expected Node) (line 9, column 16 (offset: 355))
" MERGE (r)-\\\[:THROUGH\\\_CHANNEL]->(dc)"
^}
```

