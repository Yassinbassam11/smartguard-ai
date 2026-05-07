// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VulnerableDemo {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() payable {
        owner = msg.sender;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Transfer failed");

        balances[msg.sender] = 0;
    }

    function privilegedWithdraw(address payable to) external {
        require(tx.origin == owner, "Not owner");
        to.transfer(address(this).balance);
    }

    function destroy(address payable receiver) external {
        selfdestruct(receiver);
    }

    function drain(address payable receiver) external {
        receiver.transfer(address(this).balance);
    }
}
