local node = ARGV[1]

local indexExist = redis.call('EXISTS', 'NodeList:HierarchyTreeDownward:'..node)

if (not indexExist) then return end

local ancestorNodeList = redis.call('SMEMBERS', 'NodeList:HierarchyTreeUpward:'..node)

for index, ancestorNode in pairs(ancestorNodeList) do
    redis.call('SREM', 'NodeList:HierarchyTreeDownward:'..ancestorNode, node)
end

redis.call('DEL', 'NodeList:HierarchyTreeDownward:' .. node)
redis.call('DEL', 'NodeList:HierarchyTreeUpward:' .. node)
