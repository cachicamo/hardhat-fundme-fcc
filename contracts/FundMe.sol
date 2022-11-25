// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "./PriceConverter.sol";
import "./errors.sol";

// error FundMe__NotOwner();

/**
 * @title A contract for crowd funding
 * @author Jesus Porrello
 * @notice This contract is to demo a sample crowd funding
 * @dev This implements price feeds as out Library
 */
contract FundMe {
    // Type declarations
    using PriceConverter for uint256;

    // State variables
    uint256 public constant MINIMUMUSD = 50 * 1e18;
    address[] private s_funders;
    mapping(address => uint256) private s_addressToAmountFunded;
    address private immutable i_owner;
    AggregatorV3Interface private s_priceFeed;

    // Modifiers
    modifier onlyOwner() {
        // require(msg.sender == i_owner, "Not Contract Owner!");
        // gas to deploy: 766,827

        if (msg.sender != i_owner) {
            revert FundMe__NotOwner();
        }
        // gas to deploy: 741,763
        _;
    }

    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    /**
     * @notice This function funds the contract
     * @dev This implements price feeds as out Library
     */
    function fund() public payable {
        // msg.vaue becomes first parameter for getConversionRate()
        // require(msg.value.getConversionRate() >= MINIMUMUSD, "Not enough contribution");
        // 716,658
        if (msg.value.getConversionRate(s_priceFeed) < MINIMUMUSD) {
            revert FundMe__NotEnoughSent();
        } // 687,880
        s_addressToAmountFunded[msg.sender] += msg.value;
        s_funders.push(msg.sender);
    }

    /**
     * @notice This function withdraws all funds in the contract to owner wallet
     * @dev This implements price feeds as out Library
     */
    function withdraw() public onlyOwner {
        for (
            uint256 fundersIndex = 0;
            fundersIndex < s_funders.length;
            fundersIndex++
        ) {
            address funder = s_funders[fundersIndex];
            s_addressToAmountFunded[funder] = 0;
        }

        s_funders = new address[](0);

        // different ways to withdraw
        // transfer
        // msg.sender = address
        // payable(msg.sender) = payable address
        // reverts if fails
        // payable(msg.sender).transfer(address(this).balance);

        // send
        // bool sendSuccess = payable(msg.sender).send(address(this).balance);
        // require(sendSuccess, "send error, revert");

        // call - you can call functions without having ABI
        // returns two variables dataReturned is array so it needs memory tag
        // (bool callSuccess, bytes memory dataReturned) = payable(msg.sender).call{ value: address(this).balance }("");
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");

        // require(callSuccess, "call error, revert"); // 741,763
        if (!callSuccess) {
            revert FundMe__CallError();
        } // 716,646
    }

    function cheaperWithdraw() public payable onlyOwner {
        address[] memory funders = s_funders;
        for (
            uint256 fundersIndex = 0;
            fundersIndex < funders.length;
            fundersIndex++
        ) {
            address funder = funders[fundersIndex];
            s_addressToAmountFunded[funder] = 0;
        }

        s_funders = new address[](0);
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");

        if (!callSuccess) {
            revert FundMe__CallError();
        }
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function getAddressToAmountFunded(
        address funder
    ) public view returns (uint256) {
        return s_addressToAmountFunded[funder];
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }
}
