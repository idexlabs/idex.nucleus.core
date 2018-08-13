local handledEventItemKeyListItemKey = ARGV[1]
local currentTimestamp = ARGV[2]
local TTLTimestamp = ARGV[3]
local eventItemKey = ARGV[4]

local eventRank = redis.call('ZRANK', handledEventItemKeyListItemKey, eventItemKey)

if (eventRank) then return { false, eventRank } end;

redis.call('ZADD', handledEventItemKeyListItemKey, TTLTimestamp, eventItemKey);
redis.call('ZREMRANGEBYSCORE', handledEventItemKeyListItemKey, 0, currentTimestamp)

return { true, eventRank };