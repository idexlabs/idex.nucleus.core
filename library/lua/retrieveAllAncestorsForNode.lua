local itemKey = ARGV[1]
local nodeListStringified = ARGV[2]

local nodeList = loadstring('return '..nodeListStringified)()
local ancestorNodeListAccumulator = {};

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
local function retrieveAllAncestorsForNode (node)
    local nodeList = {};

    local function recursivelyRetrieveAncestorForNodeByID(node)
        local ancestorNodeList = redis.call('ZRANGEBYLEX', itemKey, '[SPO:'.. node ..':is-member-of', '[SPO:'.. node ..':is-member-of:\xff')

        if (table.getn(ancestorNodeList) == 0) then return true end

        redis.log(redis.LOG_DEBUG, string.format("Nucleus: Retrieved %s ancestor(s) for vector %s.", table.getn(ancestorNodeList), node));

        for index, tripple in pairs(ancestorNodeList) do

            local splittedTripple = splitTripple(tripple)
            local subject = node
            local predicate = splittedTripple[3]
            local object = splittedTripple[4]

            if object == 'SYSTEM' then return true end

            local ancestorIsAlreadyRetrieved = contains(nodeList, object);

            if (not ancestorIsAlreadyRetrieved) then
                table.insert(nodeList, object)

                recursivelyRetrieveAncestorForNodeByID(object)
            end
        end

    end

    recursivelyRetrieveAncestorForNodeByID(node)

    return nodeList;
end

for index, node in pairs(nodeList) do
    if (redis.call('EXISTS', 'NodeList:HierarchyTreeUpward:' .. node) == 1) then
        redis.log(redis.LOG_DEBUG, "FU0");

        local cachedAncestorNodeList = redis.call('SMEMBERS', 'NodeList:HierarchyTreeUpward:' .. node)

        table.insert(ancestorNodeListAccumulator, cachedAncestorNodeList)
    else
        redis.log(redis.LOG_DEBUG, "FU1");

        local ancestorNodeList = retrieveAllAncestorsForNode(node)

        table.insert(ancestorNodeListAccumulator, ancestorNodeList)
    end
end

return ancestorNodeListAccumulator;