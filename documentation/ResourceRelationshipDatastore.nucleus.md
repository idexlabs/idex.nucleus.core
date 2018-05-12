# Global





* * *

## Class: NucleusResourceRelationshipDatastore



## Class: NucleusResourceRelationshipDatastore
Creates a resource relationship datastore. The constructor returns a Proxy that interfaces the class and a Promise that resolves once
the server is connected.

### NucleusResourceRelationshipDatastore.createRelationshipBetweenSubjectAndObject(subject, predicate, object) 

Creates a relationship between the subject and the object.

**Parameters**

**subject**: `String`, Creates a relationship between the subject and the object.

**predicate**: `String`, Creates a relationship between the subject and the object.

**object**: `String`, Creates a relationship between the subject and the object.

**Returns**: `Promise.<void>;`

### NucleusResourceRelationshipDatastore.removeAllRelationshipsToVector(vector) 

Removes all relationship to the vector.

**Parameters**

**vector**: `String`, Removes all relationship to the vector.

**Returns**: `Promise.<void>;`

### NucleusResourceRelationshipDatastore.retrieveObjectOfRelationshipWithSubject(subject, predicate) 

Retrieves the object of a subject's relationship.

**Parameters**

**subject**: `String`, Retrieves the object of a subject's relationship.

**predicate**: `String`, Retrieves the object of a subject's relationship.

**Returns**: `Promise.<Array>;`

### NucleusResourceRelationshipDatastore.retrieveSubjectOfRelationshipWithObject(object, predicate) 

Retrieves the subject of an object's relationship.

**Parameters**

**object**: `String`, Retrieves the subject of an object's relationship.

**predicate**: `String`, Retrieves the subject of an object's relationship.

**Returns**: `Promise.<Array>;`



* * *










