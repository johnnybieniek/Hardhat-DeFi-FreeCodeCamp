const { getNamedAccounts, ethers } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()

    const lendingPool = await getLendingPool(deployer)
    console.log(`LendingPool address: ${lendingPool.address}`)

    const wethTokesAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

    await approveErc20(wethTokesAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Depositing...")
    await lendingPool.deposit(wethTokesAddress, AMOUNT, deployer, 0)
    console.log("Deposited!")

    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer)

    const daiPrice = await getDaiPrice()
    console.log(`The DAI/ETH price is: ${daiPrice}`)

    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    console.log(`You can borrow ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())

    // Borrowing
    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)

    await repay(amountDaiToBorrowWei, daiAddress, lendingPool, account)
}

//dai address: "0x6B175474E89094C44Da98b954EedeAC495271d0F"

async function repay(amount, daiAddress, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account)

    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid!")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrow, 1, 0, account)
    await borrowTx.wait(1)
    console.log("You have successfully borrowed!")
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    return price
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(
        `You have ${ethers.utils.formatUnits(
            totalCollateralETH
        )}ETH, your debt is ${ethers.utils.formatUnits(
            totalDebtETH
        )}ETH, you can borrow ${ethers.utils.formatUnits(availableBorrowsETH)}ETH`
    )
    return { availableBorrowsETH, totalDebtETH }
}

async function getLendingPool(account) {
    const lendingPoolAddressProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )
    const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)

    return lendingPool
}

async function approveErc20(erc20address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20address, account)

    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Approved!")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

// Lending Pool Address Provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
