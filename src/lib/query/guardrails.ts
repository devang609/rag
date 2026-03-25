import { parse, type Statement } from "pgsql-ast-parser";

import { ALLOWED_COLUMN_NAMES, ALLOWED_RELATION_NAMES } from "@/lib/query/semantic-catalog";

const BLOCKED_KEYWORDS = [
  /\binsert\b/i,
  /\bupdate\b/i,
  /\bdelete\b/i,
  /\bdrop\b/i,
  /\balter\b/i,
  /\btruncate\b/i,
  /\bcreate\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\bcomment\b/i,
];

export function validateReadOnlySql(query: string): string {
  const sqlText = query.trim();
  if (!sqlText) {
    throw new Error("Generated SQL was empty.");
  }

  for (const blockedKeyword of BLOCKED_KEYWORDS) {
    if (blockedKeyword.test(sqlText)) {
      throw new Error("Only read-only SELECT queries are allowed.");
    }
  }

  const statements = parse(sqlText);
  if (statements.length !== 1) {
    throw new Error("Exactly one SQL statement is allowed.");
  }

  const statement = statements[0];
  if (!isSelectableStatement(statement)) {
    throw new Error("Only SELECT or CTE-backed SELECT statements are allowed.");
  }

  const context = {
    relations: new Set<string>(),
    columns: new Set<string>(),
    relationAliases: new Set<string>(),
    columnAliases: new Set<string>(),
    limitFound: false,
  };

  walkNode(statement, context);

  if (!context.limitFound) {
    throw new Error("Queries must include a LIMIT clause.");
  }

  for (const relation of context.relations) {
    if (!ALLOWED_RELATION_NAMES.has(relation)) {
      throw new Error(`Queries may only read from allowlisted views. Found: ${relation}`);
    }
  }

  for (const column of context.columns) {
    if (!ALLOWED_COLUMN_NAMES.has(column)) {
      throw new Error(`Column ${column} is not allowlisted for query access.`);
    }
  }

  return sqlText;
}

function isSelectableStatement(statement: Statement) {
  return (
    statement.type === "select" ||
    statement.type === "with" ||
    statement.type === "with recursive" ||
    statement.type === "union" ||
    statement.type === "union all"
  );
}

function walkNode(
  node: unknown,
  context: {
    relations: Set<string>;
    columns: Set<string>;
    relationAliases: Set<string>;
    columnAliases: Set<string>;
    limitFound: boolean;
  },
): void {
  if (!node) {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      walkNode(item, context);
    }
    return;
  }

  if (typeof node !== "object") {
    return;
  }

  const maybeTypedNode = node as {
    type?: string;
    name?: string | { name?: string };
    alias?: { name?: string };
    statement?: unknown;
    expr?: unknown;
    limit?: unknown;
  };

  if (maybeTypedNode.alias?.name) {
    if ("statement" in maybeTypedNode && maybeTypedNode.statement) {
      context.relationAliases.add(maybeTypedNode.alias.name);
    }

    if ("expr" in maybeTypedNode && maybeTypedNode.expr) {
      context.columnAliases.add(maybeTypedNode.alias.name);
    }
  }

  if (typeof maybeTypedNode.type === "string") {
    if (maybeTypedNode.type === "table") {
      const tableName =
        typeof maybeTypedNode.name === "string"
          ? maybeTypedNode.name
          : typeof maybeTypedNode.name === "object" && maybeTypedNode.name
            ? maybeTypedNode.name.name ?? ""
            : "";

      if (tableName && !context.relationAliases.has(tableName)) {
        context.relations.add(tableName);
      }
    }

    if (maybeTypedNode.type === "ref") {
      const refNode = node as { name: string; table?: { name?: string } };
      if (refNode.name === "*") {
        throw new Error("Wildcard column selection is not allowed.");
      }
      if (!context.columnAliases.has(refNode.name)) {
        context.columns.add(refNode.name);
      }
    }

    if (maybeTypedNode.limit) {
      context.limitFound = true;
    }
  }

  for (const value of Object.values(node)) {
    walkNode(value, context);
  }
}
