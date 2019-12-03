## Installation
- set proper config variables in *config/default.js* for mysql&redis connections
- run command *"npm run generate"* to generate mock data for mysql db
- start REST server using command *"npm run dev"* (or use *"npm start"* to start the server in production environment)

## Resources
- Author (mounted at /api/v1/authors)
    - `id: Integer`
    - `name: String`    
- Book ( mounted at /api/v1/books)
    - `id: Integer`
    - `title: String`
    - `description: String`
    - `author: Integer` - reference to author id
    - `author_name: String` - reference to author name (read-only) 
    - `image: String`
    - `date: Date`
## REST endpoints
**Books**
- `[GET]` endpoint?[params list] - list books

    params list:
    - `offset: Integer` - If negative, it is treated as `totalLength - offset`
    - `limit: Integer`
    - `fields` - comma separated fields to retrieve (fields=title,description,date) 
    - `order` - comma separated fields, "-" before field name means desc sorting, asc otherwise (order=-date)
    - `where` - comma separated expressions like `field:[operator]:[value]:[useOR]`
        - supported operators: (`like`, `eq` (default), `gt`, `lt`)
        - if any value is present, conditions will be combined by the OR operator
 
    
- `[GET]` endpoint/:resourceId?[params] - get specific resource
    params list:
    - fields - (to simplify the logic of the code, field filtering is ignored when returning a cached entry)
- `[POST]` endpoint (add resource)
- `[PATCH]` endpoint/:resourceId (update the data for the specified resource)
 
 ## Cache remarks
 There are two kinds of caches here:
 - dumb caching that relies on the query string for a very short time (15 seconds) without any cache invalidation logic.
 - entity cache that relies on the id of each entity. Cache invalidation is performed on every entity updating.
 ## Some request examples
 - http://localhost:3000/api/v1/books/1
 - http://localhost:3000/api/v1/books/1?fields=title
 - http://localhost:3000/api/v1/books
 - http://localhost:3000/api/v1/books?fields=id,title,author_name
 - http://localhost:3000/api/v1/books?fields=id,title,date&order=-date
 - http://localhost:3000/api/v1/books?fields=id,title,date&order=-date&where=date:gt:1980-01-01,date:lt:2000-01-01
