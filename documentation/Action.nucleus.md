# Global





* * *

## Class: NucleusAction



## Class: NucleusAction
Creates a Nucleus Action.

**name**: `String` , Creates a Nucleus Action.
**originalMessage**: `Object` , Creates a Nucleus Action.
**originUserID**: `String` , Creates a Nucleus Action.
**CompletedActionStatus**:  , Creates a Nucleus Action.
**FailedActionStatus**:  , Creates a Nucleus Action.
**PendingActionStatus**:  , Creates a Nucleus Action.
**ProcessingActionStatus**:  , Creates a Nucleus Action.
**NucleusActionStatusWeightList**:  , Creates a Nucleus Action.
### NucleusAction.updateMessage(actionMessage) 

Updates the Nucleus Action final message.

**Parameters**

**actionMessage**: `Object`, Updates the Nucleus Action final message.


### NucleusAction.updateStatus(actionStatus) 

Updates the Nucleus Action status.

**Parameters**

**actionStatus**: `String`, Updates the Nucleus Action status.


**Example**:
```js
$action.updateStatus(NucleusAction.CompletedActionStatus);
```



* * *



**Author:** Sebastien Filion



**Overview:** Define the Nucleus Action class that is used to create an action.


