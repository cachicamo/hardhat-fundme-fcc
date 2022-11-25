const networkConfig = {
    5: {
        name: "goerli",
        ethUsdPriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    },
    97: {
        name: "testnet-bsc",
        ethUsdPriceFeed: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526",
    },
    137: {
        name: "polygon",
        ethUsdPriceFeed: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
    },
    // 31337
}

const developmentChains = ["hardhat", "localhost"]
const DECIMALS = 8
const INITIAL_ANSWER = 200000000000

module.exports = {
    networkConfig,
    developmentChains,
    DECIMALS,
    INITIAL_ANSWER,
}
