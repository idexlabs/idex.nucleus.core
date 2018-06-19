local itemKey = ARGV[1]
local node = ARGV[2]

local nodeList = {}

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
local function recursivelyRetrieveChildrenForNodeByID(vector)
    local ancestorNodeList = redis.call('ZRANGEBYLEX', itemKey, '[OPS:'.. vector ..':is-member-of', '[OPS:'.. vector ..':is-member-of:\xff')

    if (table.getn(ancestorNodeList) == 0) then return true end

    redis.log(redis.LOG_DEBUG, string.format("Nucleus: Retrieved %s children(s) for vector %s.", table.getn(ancestorNodeList), vector));

    for index, tripple in pairs(ancestorNodeList) do

        local splittedTripple = splitTripple(tripple)
        local object = vector
        local predicate = splittedTripple[3]
        local subject = splittedTripple[4]

        if subject == 'SYSTEM' then return true end

        local ancestorIsAlreadyRetrieved = contains(nodeList, subject);

        if (not ancestorIsAlreadyRetrieved) then
            table.insert(nodeList, subject)

            recursivelyRetrieveChildrenForNodeByID(subject)
        end
    end

end

recursivelyRetrieveChildrenForNodeByID(node)

return nodeList;