local itemKey = ARGV[1]
local node = ARGV[2]

local function contains(table, element)
    for _, value in pairs(table) do
        if value == element then
            return true
        end
    end
    return false
end

-- Splits a tripple into a table
local function splitTripple (tripple)
    local splittedTripple = {}
    local index = 1
    for vector in string.gmatch(tripple, "([^:]+)") do
        splittedTripple[index] = vector
        index = index + 1
    end

    return splittedTripple
end


-- Retrieve the ancestor for a given node
-- Copied from /lua/retrieveAllAncestorsForNode
local function retrieveAllAncestorsForNode (node)
    local nodeList = {};

    local function recursivelyRetrieveAncestorForNode(node)
        local trippleList = redis.call('ZRANGEBYLEX', itemKey, '[SPO:'.. node ..':is-member-of', '[SPO:'.. node ..':is-member-of:\xff')

        if (table.getn(trippleList) == 0) then return true end

        redis.log(redis.LOG_DEBUG, string.format("Nucleus: Retrieved %s ancestor(s) for vector %s.", table.getn(trippleList), node));

        for index, tripple in pairs(trippleList) do

            local splittedTripple = splitTripple(tripple)
            local subject = node
            local predicate = splittedTripple[3]
            local object = splittedTripple[4]

            for index, ancestorNode in pairs(trippleList) do
                redis.log(redis.LOG_DEBUG, string.format("Nucleus: %s %s -> %s.", index, ancestorNode, node));
            end

            if subject == 'SYSTEM' then return true end

            local ancestorIsAlreadyRetrieved = contains(nodeList, object);

            if (not ancestorIsAlreadyRetrieved) then
                table.insert(nodeList, object)

                recursivelyRetrieveAncestorForNode(object)
            end
        end

    end

    recursivelyRetrieveAncestorForNode(node)

    return nodeList;
end

local ancestorNodeList = retrieveAllAncestorsForNode(node)

--table.insert(ancestorNodeList, node)

for index, ancestorNode in pairs(ancestorNodeList) do
    redis.log(redis.LOG_DEBUG, string.format("Nucleus: %s is the ancestor of %s.", ancestorNode, node));

    redis.call('SADD', 'NodeList:HierarchyTreeDownward:' .. ancestorNode, node)
    redis.call('SADD', 'NodeList:HierarchyTreeUpward:' .. node, ancestorNode)
end
