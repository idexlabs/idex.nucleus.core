"use strict";

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const mocha = require('mocha');
const uuid = require('uuid');
const sinon = require('sinon');

chai.use(chaiAsPromised);

const NucleusDatastore = require('../library/Datastore.nucleus');
const NucleusError = require('../library/Error.nucleus');
const NucleusResource = require('../library/Resource.nucleus');
const NucleusResourceAPI = require('../library/ResourceAPI.nucleus');
const NucleusResourceRelationshipDatastore = require('../library/ResourceRelationshipDatastore.nucleus');

const DATASTORE_INDEX = 0;
const DATASTORE_URL = 'localhost';
const DATASTORE_PORT = 6379;

const resourceName = 'Dummy';

class DummyResourceModel extends NucleusResource {

  constructor (resourceAttributes, authorUserID) {
    super('Dummy', { name: 'string' }, resourceAttributes, authorUserID);
  }

}

mocha.suite("Nucleus Resource API", function () {

  mocha.suiteSetup(function () {
    const $datastore = new NucleusDatastore('Test', {
      index: DATASTORE_INDEX,
      URL: DATASTORE_URL,
      port: DATASTORE_PORT
    });

    const $resourceRelationshipDatastore = new NucleusResourceRelationshipDatastore($datastore);

    Reflect.defineProperty(this, '$datastore', {
      value: $datastore,
      writable: false
    });

    Reflect.defineProperty(this, '$resourceRelationshipDatastore', {
      value: $resourceRelationshipDatastore,
      writable: false
    });

    return $datastore;
  });

  mocha.suiteSetup(function () {
    const $$sandbox = sinon.createSandbox();

    Reflect.defineProperty(this, '$$sandbox', {
      value: $$sandbox,
      writable: false
    });
  });

  mocha.suiteSetup(function () {
    const { $datastore } = this;

    return $datastore.$$server.flushallAsync();
  });

  mocha.suiteTeardown(function () {
    const { $datastore } = this;

    return $datastore.$$server.flushallAsync();
  });

  mocha.suiteTeardown(function () {
    const { $datastore } = this;

    return $datastore.destroy();
  });

  mocha.suite("Hierarchy tree", function () {

    mocha.suite("Simple direct branch", function () {

      mocha.setup(function () {
        const { $resourceRelationshipDatastore } = this;

        // Considering this list of ID, "SYSTEM" being the ancestor of nodeList[1] and so on and nodeList[3] being the leaf.
        const branchNodeIDList = ['SYSTEM', uuid.v4(), uuid.v4(), uuid.v4(), uuid.v4(), uuid.v4(),];

        Reflect.defineProperty(this, 'branchNodeIDList', {
          value: branchNodeIDList,
          writable: false
        });

        return Promise.all(branchNodeIDList
          .slice(0)
          .reverse()
          .map((nodeID, index, array) => {
            const ancestorNodeID = array[index + 1];

            if (!ancestorNodeID) return;

            $resourceRelationshipDatastore.createRelationshipBetweenSubjectAndObject(nodeID, 'is-member', ancestorNodeID);
          }));
      });

      mocha.teardown(function () {
        Reflect.deleteProperty(this, 'branchNodeIDList');
      });

      mocha.test("The four ancestor of our branch's leaf are retrieved in order of closeness.", async function () {
        const { $resourceRelationshipDatastore, branchNodeIDList } = this;

        const ancestorNodeIDList = await NucleusResourceAPI.walkHierarchyTreeUpward.call({ $resourceRelationshipDatastore }, branchNodeIDList[branchNodeIDList.length - 1]);

        chai.expect(ancestorNodeIDList).to.have.length(4);
        chai.expect(ancestorNodeIDList).to.deep.equal(branchNodeIDList.slice(0).reverse().splice(1, branchNodeIDList.length - 2));
      });

      mocha.test("The four children of our branch's knot are retrieved in order of closeness.", async function () {
        const { $resourceRelationshipDatastore, branchNodeIDList } = this;

        const childrenNodeIDList = await NucleusResourceAPI.walkHierarchyTreeDownward.call({ $resourceRelationshipDatastore }, branchNodeIDList[1]);

        chai.expect(childrenNodeIDList).to.have.length(4);
        chai.expect(childrenNodeIDList).to.deep.equal(branchNodeIDList.slice(0).splice(2, branchNodeIDList.length - 1));
      });

    });

    mocha.suite("Complex tree", function () {

      mocha.setup(function () {
        const { $resourceRelationshipDatastore } = this;

        // Given this structure
        //
        // SYSTEM
        //   +
        //   +-> Group <1fb6d396-dd72-4943-9528-06db943d17d8>
        //   |    +
        //   |    +-> User <fcc66afe-3d80-4225-bd1f-7a34bd26f403>
        //   |    |
        //   |    +-> Resource <61fc9214-da8a-4426-8baf-b04565e87d4c>
        //   |    |
        //   |    +-> Group <bebffed5-d356-41d9-a4ed-32d33bba5127>
        //   |         +
        //   |         +-> Resource <0da2e0ec-02a1-4756-89f5-5bf2c2d3664a>
        //   |
        //   +-> Group <6db17cee-2bc8-48b1-901b-048935ba3d23>
        //   |    +
        //   |    +-> Group <cd910f16-6b3d-47cf-8711-8e4add5e8f4f>
        //   |         +
        //   |         +-> Resource <a7dc927f-9ebd-4d3b-8cf5-2ffea24bcf57>
        //   |
        //   +-> Group <caef15f7-58a0-4418-96c2-de211ff2496b>
        //        +
        //        +-> Resource <f76a418a-a4a4-41e8-8f68-99d6b1446bbd>
        //        |
        //        +-> Group <8dcb8309-7ade-4ff4-a6ba-97e5642391c0>
        //             +
        //             +-> User <87330246-ffee-4c87-aa5a-9232bca00132>

        const treeBranchList = [
          [ 'SYSTEM', '1fb6d396-dd72-4943-9528-06db943d17d8', 'bebffed5-d356-41d9-a4ed-32d33bba5127', '0da2e0ec-02a1-4756-89f5-5bf2c2d3664a' ],
          [ 'SYSTEM', '1fb6d396-dd72-4943-9528-06db943d17d8', '61fc9214-da8a-4426-8baf-b04565e87d4c' ],
          [ 'SYSTEM', '1fb6d396-dd72-4943-9528-06db943d17d8', 'fcc66afe-3d80-4225-bd1f-7a34bd26f403' ],
          [ 'SYSTEM', '6db17cee-2bc8-48b1-901b-048935ba3d23', 'cd910f16-6b3d-47cf-8711-8e4add5e8f4f', 'a7dc927f-9ebd-4d3b-8cf5-2ffea24bcf57' ],
          [ 'SYSTEM', 'caef15f7-58a0-4418-96c2-de211ff2496b', '8dcb8309-7ade-4ff4-a6ba-97e5642391c0', '87330246-ffee-4c87-aa5a-9232bca00132' ],
          [ 'SYSTEM', 'caef15f7-58a0-4418-96c2-de211ff2496b', 'f76a418a-a4a4-41e8-8f68-99d6b1446bbd' ]
        ];

        Reflect.defineProperty(this, 'treeBranchList', {
          value: treeBranchList,
          writable: false
        });

        return generateHierarchyTree.call({ $resourceRelationshipDatastore }, treeBranchList);
      });

      mocha.teardown(function () {
        Reflect.deleteProperty(this, 'treeBranchList');
      });

      mocha.test("The two ancestors of the resource (0da2e0ec-02a1-4756-89f5-5bf2c2d3664a) are retrieved in order of closeness.", async function () {
        const { $resourceRelationshipDatastore } = this;

        const ancestorNodeIDList = await NucleusResourceAPI.walkHierarchyTreeUpward.call({ $resourceRelationshipDatastore }, '0da2e0ec-02a1-4756-89f5-5bf2c2d3664a');

        chai.expect(ancestorNodeIDList).to.have.length(2);
        chai.expect(ancestorNodeIDList).to.deep.equal([ 'bebffed5-d356-41d9-a4ed-32d33bba5127', '1fb6d396-dd72-4943-9528-06db943d17d8' ]);
      });

      mocha.test("The ancestor of the resource (61fc9214-da8a-4426-8baf-b04565e87d4c) is retrieved.", async function () {
        const { $resourceRelationshipDatastore } = this;

        const ancestorNodeIDList = await NucleusResourceAPI.walkHierarchyTreeUpward.call({ $resourceRelationshipDatastore }, '61fc9214-da8a-4426-8baf-b04565e87d4c');

        chai.expect(ancestorNodeIDList).to.have.length(1);
        chai.expect(ancestorNodeIDList).to.deep.equal([ '1fb6d396-dd72-4943-9528-06db943d17d8' ]);
      });

      mocha.test("The ancestor of the user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) is retrieved.", async function () {
        const { $resourceRelationshipDatastore } = this;

        const ancestorNodeIDList = await NucleusResourceAPI.walkHierarchyTreeUpward.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403');

        chai.expect(ancestorNodeIDList).to.have.length(1);
        chai.expect(ancestorNodeIDList).to.deep.equal([ '1fb6d396-dd72-4943-9528-06db943d17d8' ]);
      });

      mocha.test("The three childrens of the group (caef15f7-58a0-4418-96c2-de211ff2496b) are retrieved in order of closeness.", async function () {
        const { $resourceRelationshipDatastore } = this;

        const childrenNodeIDList = await NucleusResourceAPI.walkHierarchyTreeDownward.call({ $resourceRelationshipDatastore }, 'caef15f7-58a0-4418-96c2-de211ff2496b');

        chai.expect(childrenNodeIDList).to.have.length(3);
        chai.expect(childrenNodeIDList).to.deep.equal(['8dcb8309-7ade-4ff4-a6ba-97e5642391c0', 'f76a418a-a4a4-41e8-8f68-99d6b1446bbd', '87330246-ffee-4c87-aa5a-9232bca00132']);
      });

      mocha.test("The user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) can retrieve the resource (61fc9214-da8a-4426-8baf-b04565e87d4c).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canRetrieveResource } = await NucleusResourceAPI.verifyThatUserCanRetrieveResource.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403', '61fc9214-da8a-4426-8baf-b04565e87d4c');

        chai.expect(canRetrieveResource).to.be.true;
      });

      mocha.test("The user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) can retrieve the resource (0da2e0ec-02a1-4756-89f5-5bf2c2d3664a).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canRetrieveResource } = await NucleusResourceAPI.verifyThatUserCanRetrieveResource.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403', '0da2e0ec-02a1-4756-89f5-5bf2c2d3664a');

        chai.expect(canRetrieveResource).to.be.true;
      });

      mocha.test("The user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) can not retrieve the resource (a7dc927f-9ebd-4d3b-8cf5-2ffea24bcf57).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canRetrieveResource } = await NucleusResourceAPI.verifyThatUserCanRetrieveResource.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403', 'a7dc927f-9ebd-4d3b-8cf5-2ffea24bcf57');

        chai.expect(canRetrieveResource).to.be.false;
      });

      mocha.test("The user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) can update the resource (61fc9214-da8a-4426-8baf-b04565e87d4c).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canUpdateResource } = await NucleusResourceAPI.verifyThatUserCanUpdateResource.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403', '61fc9214-da8a-4426-8baf-b04565e87d4c');

        chai.expect(canUpdateResource).to.be.true;
      });

      mocha.test("The user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) can update the resource (0da2e0ec-02a1-4756-89f5-5bf2c2d3664a).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canUpdateResource } = await NucleusResourceAPI.verifyThatUserCanUpdateResource.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403', '0da2e0ec-02a1-4756-89f5-5bf2c2d3664a');

        chai.expect(canUpdateResource).to.be.true;
      });

      mocha.test("The user (fcc66afe-3d80-4225-bd1f-7a34bd26f403) can not update the resource (a7dc927f-9ebd-4d3b-8cf5-2ffea24bcf57).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canUpdateResource } = await NucleusResourceAPI.verifyThatUserCanUpdateResource.call({ $resourceRelationshipDatastore }, 'fcc66afe-3d80-4225-bd1f-7a34bd26f403', 'a7dc927f-9ebd-4d3b-8cf5-2ffea24bcf57');

        chai.expect(canUpdateResource).to.be.false;
      });

      mocha.test("The user (87330246-ffee-4c87-aa5a-9232bca00132) can not update the resource (f76a418a-a4a4-41e8-8f68-99d6b1446bbd).", async function () {
        const { $resourceRelationshipDatastore } = this;

        const { canUpdateResource } = await NucleusResourceAPI.verifyThatUserCanUpdateResource.call({ $resourceRelationshipDatastore }, '87330246-ffee-4c87-aa5a-9232bca00132', 'f76a418a-a4a4-41e8-8f68-99d6b1446bbd');

        chai.expect(canUpdateResource).to.be.false;
      });

    });

  });

  mocha.suite("Persistent storage", function () {
    const resourceType = 'Dummy';

    class DummyResourceModel extends NucleusResource {

      constructor (resourceAttributes, authorUserID, reservedID) {
        super('Dummy', { name: 'string' }, resourceAttributes, authorUserID, reservedID);
      }
    }

    mocha.setup(function () {
      const { $datastore, $resourceRelationshipDatastore } = this;

      // Given this structure
      //
      // SYSTEM
      // +
      // +-> Group <282c1b2c-0cd4-454f-bf8f-52b450e7aee5>
      // |    +
      // |    +-> User <e11918ea-2bd4-4d8f-bf90-2c431076e23c>
      // |    |
      // |    +-> Group <69b8a1da-95e1-4f20-8529-c03ba9bc7807>
      // |
      // +-> Group <e619b5e2-2737-42fa-aa13-f75740270107>
      // |
      // +-> Group <61b27ed4-4b79-4b47-87c6-35440e2cc62a>
      //   +
      //   +-> Group <4648d7c6-0d2e-461c-a0ed-cbdb76d41a87>
      //   +
      //   +-> User <1c76c8d1-8cdc-4c40-8132-36f657b5bf69>

      const treeBranchList = [
        [ 'SYSTEM', '282c1b2c-0cd4-454f-bf8f-52b450e7aee5', 'e11918ea-2bd4-4d8f-bf90-2c431076e23c', '69b8a1da-95e1-4f20-8529-c03ba9bc7807' ],
        [ 'SYSTEM', 'e619b5e2-2737-42fa-aa13-f75740270107' ],
        [ 'SYSTEM', '61b27ed4-4b79-4b47-87c6-35440e2cc62a', '4648d7c6-0d2e-461c-a0ed-cbdb76d41a87' ],
        [ 'SYSTEM', '61b27ed4-4b79-4b47-87c6-35440e2cc62a', '1c76c8d1-8cdc-4c40-8132-36f657b5bf69' ],
      ];

      Reflect.defineProperty(this, 'treeBranchList', {
        value: treeBranchList,
        writable: false
      });

      return generateHierarchyTree.call({ $resourceRelationshipDatastore }, treeBranchList);
    });

    mocha.teardown(function () {
      Reflect.deleteProperty(this, 'treeBranchList');
    });

    mocha.teardown(function () {
      const { $datastore, $resourceRelationshipDatastore } = this;

      // Automatically restore any method that could have been wrapped as Spy.
      [
        $datastore,
        $resourceRelationshipDatastore
      ]
        .forEach($store => {

          Object.keys($store)
            .filter((key) => {
              if (key === 'name' || key === 'index') return false;
              if (/^\$+.+/.test(key)) return false;
              else return true;
            })
            .forEach((key) => {
              const { value } = Reflect.getOwnPropertyDescriptor($store, key);

              if ('restore' in value) value.restore();
            });
        });
    });

    mocha.suite("#createResource", function () {

      mocha.test("The dummy resource is created in the datastore.", function () {
        const { $datastore, $resourceRelationshipDatastore, $$sandbox } = this;
        const $$datastoreAddItemToHashFieldByNameSpy = $$sandbox.spy($datastore, 'addItemToHashFieldByName');

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';
        const groupID = '282c1b2c-0cd4-454f-bf8f-52b450e7aee5';

        return NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID, groupID)
          .then(() => {
            chai.expect($$datastoreAddItemToHashFieldByNameSpy.calledOnceWith(
              sinon.match(/Dummy:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/),
              sinon.match({
                ID: sinon.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/),
                meta: sinon.match.object,
                name: dummyAttributes.name,
                type: resourceType
              })
            )).to.be.true;
          });
      });

      mocha.test("The dummy resource's relationship with its author and its group is created.", function () {
        const { $datastore, $resourceRelationshipDatastore, $$sandbox } = this;
        const $$resourceRelationshipDatastoreCreateRelationshipBetweenSubjectAndObject = $$sandbox.spy($resourceRelationshipDatastore, 'createRelationshipBetweenSubjectAndObject');

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';
        const groupID = '69b8a1da-95e1-4f20-8529-c03ba9bc7807';

        return NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID, groupID)
          .then(() => {
            chai.expect($$resourceRelationshipDatastoreCreateRelationshipBetweenSubjectAndObject.calledTwice).to.be.true;
            chai.expect($$resourceRelationshipDatastoreCreateRelationshipBetweenSubjectAndObject.calledWith(
              sinon.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/),
              'is-member',
              groupID
            )).to.be.true;
            chai.expect($$resourceRelationshipDatastoreCreateRelationshipBetweenSubjectAndObject.calledWith(
              sinon.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/),
              'is-authored',
              authorUserID
            )).to.be.true;
          });
      });

      mocha.test("The dummy resource can be created without a resource relationship datastore.", function () {
        const { $datastore, $resourceRelationshipDatastore, $$sandbox } = this;
        const $$resourceRelationshipDatastoreCreateRelationshipBetweenSubjectAndObject = $$sandbox.spy($resourceRelationshipDatastore, 'createRelationshipBetweenSubjectAndObject');

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';
        const groupID = '282c1b2c-0cd4-454f-bf8f-52b450e7aee5';

        return NucleusResourceAPI.createResource.call({ $datastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID, groupID)
          .then(() => {
            chai.expect($$resourceRelationshipDatastoreCreateRelationshipBetweenSubjectAndObject.notCalled).to.be.true;
          });
      });

      mocha.test("The formatted resource, the resource's author and the resource's group is returned.", function () {
        const { $datastore, $resourceRelationshipDatastore } = this;

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';
        const groupID = '282c1b2c-0cd4-454f-bf8f-52b450e7aee5';

        return NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID, groupID)
          .then(({ resource, resourceAuthorID, resourceMemberNodeID }) => {
            chai.expect(resource).to.be.an.instanceOf(NucleusResource);
            chai.expect(resource).to.deep.include(dummyAttributes);
            chai.expect(resourceAuthorID).to.equal(authorUserID);
            chai.expect(resourceMemberNodeID).to.equal(groupID);
          });
      });

      mocha.test("The dummy resource is created by default in the group of the author user.", function () {
        const { $datastore, $resourceRelationshipDatastore } = this;

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';

        return chai.expect(NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID))
          .to.eventually.deep.include({ resourceMemberNodeID: '282c1b2c-0cd4-454f-bf8f-52b450e7aee5' });
      });

      mocha.test.skip("The resource can reserve its own ID.", function () {
        const { $datastore, $resourceRelationshipDatastore } = this;

        const dummyAttributes = {
          ID: uuid.v4(),
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';

        return chai.expect(NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID))
          .to.eventually.deep.include({ resource: { ID: dummyAttributes.ID } });
      });

      mocha.test("Using resource attributes that doesn't validate against the resource model throws an error.", function () {
        const { $datastore, $resourceRelationshipDatastore } = this;

        const dummyAttributes = {
          name: 9000
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';

        return chai.expect(NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID))
          .to.be.rejectedWith(NucleusError, /.*Expected a value of type `string` for `name` but received `9000`.*/);
      });

      mocha.test("Using an undefined resource type throws an error.", function () {
        const { $datastore, $resourceRelationshipDatastore } = this;

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';

        return chai.expect(NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, undefined, DummyResourceModel, dummyAttributes, authorUserID))
          .to.be.rejectedWith(NucleusError.UnexpectedValueTypeNucleusError);
      });

      mocha.test("Using an undefined resource model throws an error.", function () {
        const { $datastore, $resourceRelationshipDatastore } = this;

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';

        return chai.expect(NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, undefined, dummyAttributes, authorUserID))
          .to.be.rejectedWith(NucleusError.UnexpectedValueTypeNucleusError);
      });

      mocha.test("Using a non-existing user throws an error.", function () {
        const { $datastore, $resourceRelationshipDatastore } = this;

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = uuid.v4();

        return chai.expect(NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID))
          .to.be.rejectedWith(NucleusError);
      });

    });

    mocha.suite("#removeResourceByID", function () {

      mocha.test("The dummy resource is removed from the datastore.", async function () {
        const { $datastore, $resourceRelationshipDatastore, $$sandbox } = this;
        const $$datastoreRemoveItemByNameSpy = $$sandbox.spy($datastore, 'removeItemByName');

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';
        const groupID = '282c1b2c-0cd4-454f-bf8f-52b450e7aee5';

        const { resource: { ID: resourceID } } = await NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID, groupID);

        return NucleusResourceAPI.removeResourceByID.call({ $datastore, $resourceRelationshipDatastore }, resourceType, resourceID, authorUserID)
          .then(() => {
            chai.expect($$datastoreRemoveItemByNameSpy.calledOnceWith(
              NucleusResource.generateItemKey(resourceType, resourceID)
            ));
          });
      });

      mocha.test("The dummy resource relationships are removed from the resource relationship datastore.", async function () {
        const { $datastore, $resourceRelationshipDatastore, $$sandbox } = this;
        const $$resourceRelationshipDatastoreRemoveAllRelationshipsToVectorSpy = $$sandbox.spy($resourceRelationshipDatastore, 'removeAllRelationshipsToVector');

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';
        const groupID = '282c1b2c-0cd4-454f-bf8f-52b450e7aee5';

        const { resource: { ID: resourceID } } = await NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID, groupID);

        return NucleusResourceAPI.removeResourceByID.call({ $datastore, $resourceRelationshipDatastore }, resourceType, resourceID, authorUserID)
          .then(() => {
            chai.expect($$resourceRelationshipDatastoreRemoveAllRelationshipsToVectorSpy.calledOnceWith(
              resourceType
            ));
          });
      });

      mocha.test("The dummy resource can't be removed by a user from another branch.", async function () {
        const { $datastore, $resourceRelationshipDatastore } = this;

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';
        const groupID = '282c1b2c-0cd4-454f-bf8f-52b450e7aee5';

        const { resource: { ID: resourceID } } = await NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID, groupID);

        const originUserID = '1c76c8d1-8cdc-4c40-8132-36f657b5bf69';

        chai.expect(NucleusResourceAPI.removeResourceByID.call({ $datastore, $resourceRelationshipDatastore }, resourceType, resourceID, originUserID))
          .to.be.rejectedWith(NucleusError.UnauthorizedActionNucleusError);
      });

    });

    mocha.suite("#retrieveResourceByID", function () {

      mocha.test("The dummy resource is retrieved from the datastore.", async function () {
        const { $datastore, $resourceRelationshipDatastore, $$sandbox } = this;
        const $$datastoreRetrieveAllItemsFromHashByNameSpy = $$sandbox.spy($datastore, 'retrieveAllItemsFromHashByName');

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';
        const groupID = '282c1b2c-0cd4-454f-bf8f-52b450e7aee5';

        const { resource: { ID: resourceID } } = await NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID, groupID);

        return NucleusResourceAPI.retrieveResourceByID.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, resourceID, authorUserID)
          .then(() => {
            chai.expect($$datastoreRetrieveAllItemsFromHashByNameSpy.calledOnceWith(
              NucleusResource.generateItemKey(resourceType, resourceID)
            ));
          });
      });

      mocha.test("The dummy resource can't be retrieve by a user from another branch.", async function () {
        const { $datastore, $resourceRelationshipDatastore } = this;

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';
        const groupID = '282c1b2c-0cd4-454f-bf8f-52b450e7aee5';

        const { resource: { ID: resourceID } } = await NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID, groupID);

        const originUserID = '1c76c8d1-8cdc-4c40-8132-36f657b5bf69';

        chai.expect(NucleusResourceAPI.retrieveResourceByID.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, resourceID, originUserID))
          .to.be.rejectedWith(NucleusError.UnauthorizedActionNucleusError);
      });

    });

    mocha.suite("#updatesResourceByID", function () {

      mocha.test("The dummy resource is updated to the datastore.", async function () {
        const { $datastore, $resourceRelationshipDatastore, $$sandbox } = this;
        const $$datastoreRetrieveAllItemsFromHashByNameSpy = $$sandbox.spy($datastore, 'retrieveAllItemsFromHashByName');
        const $$datastoreAddItemToHashFieldByNameSpy = $$sandbox.spy($datastore, 'addItemToHashFieldByName');

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';
        const groupID = '282c1b2c-0cd4-454f-bf8f-52b450e7aee5';

        const { resource: { ID: resourceID } } = await NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID, groupID);

        const dummyAttributesToUpdate = {
          name: `Dummy ${uuid.v4()}`
        };

        return NucleusResourceAPI.updatesResourceByID.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, resourceID, dummyAttributesToUpdate, authorUserID)
          .then(({ resource }) => {
            chai.expect(resource).to.deep.include({
              ID: resourceID,
              name: dummyAttributesToUpdate.name,
              type: resourceType
            });

            chai.expect(resource.meta).to.have.ownProperty('updatedISOTime');

            chai.expect($$datastoreRetrieveAllItemsFromHashByNameSpy.calledOnceWith(
              NucleusResource.generateItemKey(resourceType, resourceID)
            ));
            chai.expect($$datastoreAddItemToHashFieldByNameSpy.calledOnceWith(
              NucleusResource.generateItemKey(resourceType, resourceID),
              sinon.match({
                meta: sinon.match({
                  updatedISOTime: sinon.match.string
                }),
                name: dummyAttributesToUpdate.name
              })
            ));
          });
      });

      mocha.test("The dummy resource can't be updated by a user from another branch.", async function () {
        const { $datastore, $resourceRelationshipDatastore } = this;

        const dummyAttributes = {
          name: `Dummy ${uuid.v4()}`
        };
        const authorUserID = 'e11918ea-2bd4-4d8f-bf90-2c431076e23c';
        const groupID = '282c1b2c-0cd4-454f-bf8f-52b450e7aee5';

        const { resource: { ID: resourceID } } = await NucleusResourceAPI.createResource.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, dummyAttributes, authorUserID, groupID);

        const originUserID = '1c76c8d1-8cdc-4c40-8132-36f657b5bf69';

        chai.expect(NucleusResourceAPI.updatesResourceByID.call({ $datastore, $resourceRelationshipDatastore }, resourceType, DummyResourceModel, resourceID, { name: `Dummy ${uuid.v4()}` }, originUserID))
          .to.be.rejectedWith(NucleusError.UnauthorizedActionNucleusError);
      });

    });

  });

});

/**
 * Generates a given hierarchy tree in the relationship datastore.
 * @example
 * // Each nested array represent a branch of the tree.
 * // Each value of the nested array represents a node.
 * // `0da2e0ec` is a child of `bebffed5` which is a child of `1fb6d396` which is a child of `SYSTEM`...
 * generateHierarchyTree([
 *   [ 'SYSTEM', '1fb6d396-dd72-4943-9528-06db943d17d8', 'bebffed5-d356-41d9-a4ed-32d33bba5127', '0da2e0ec-02a1-4756-89f5-5bf2c2d3664a' ],
 *   [ 'SYSTEM', '1fb6d396-dd72-4943-9528-06db943d17d8', '61fc9214-da8a-4426-8baf-b04565e87d4c' ],
 * ]);
 *
 * @argument {Array[]} treeBranchList
 *
 * @returns {Promise}
 */
function generateHierarchyTree (treeBranchList) {
  const { $resourceRelationshipDatastore } = this;

  return Promise.all(treeBranchList
    .slice(0)
    .map((branchNodeIDList) => {

      return Promise.all(branchNodeIDList
        .slice(0)
        .reverse()
        .map((nodeID, index, array) => {
          const ancestorNodeID = array[index + 1];

          if (!ancestorNodeID) return;

          $resourceRelationshipDatastore.createRelationshipBetweenSubjectAndObject(nodeID, 'is-member', ancestorNodeID);
        }));
    }));
}