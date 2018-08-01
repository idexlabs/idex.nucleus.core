local itemKey = ARGV[1]

local objectList = {}

local reindexingVerified = redis.call('GET', 'ReindexingVerified');

if (reindexingVerified) then return objectList end

-- Splits a tripple into a table
-- Copied from /lua/retrieveAllAncestorsForNode
local function splitTripple (tripple)
    local splittedTripple = {}
    local index = 1
    for vector in string.gmatch(tripple, "([^:]+)") do
        splittedTripple[index] = vector
        index = index + 1
    end

    return splittedTripple
end

local trippleList = redis.call('ZRANGEBYLEX', itemKey, '[POS:is-member-of:', '[POS:is-member-of:\xff')

redis.log(redis.LOG_DEBUG, string.format("Nucleus: Retrieved %s tripples.", table.getn(trippleList)));

for index, tripple in pairs(trippleList) do
    local splittedTripple = splitTripple(tripple)
    local object = splittedTripple[3]

    local indexExist = redis.call('EXISTS', 'NodeList:HierarchyTreeDownward:'..object)

    if (not indexExist) then table.insert(objectList, object) end
end

redis.call('SETEX', 'ReindexingVerified', 60 * 60 * 7, '05f3b862-4bf2-4eda-80ee-6ba35f5eea52')

return objectList
