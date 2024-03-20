import Web3 from "web3";
import ComponentABI from "../abi/ComponentABI.json" ;
import SystemABI from "../abi/SystemABI.json"
import Types from "./TypesArray";
class ECSDK {
  constructor(provider) {
    this.web3 = new Web3(provider);
    this.components = [];
    this.postList=[];
  }

  addComponent(componentAddress, entityId, params) {
    this.components.push({
      componentAddress,
      entityId,
      params,
    });
  }

  getComponents() {
    return this.components;
  }

  encodeComponents() {
    var componentEncodes = [];
    for (var item of this.components) {
      var componentEncode = this.web3.eth.abi.encodeParameters(
        ["address", "uint256", "bytes"],
        [item.componentAddress, item.entityId, item.params]
      );
      componentEncodes.push(componentEncode);
    }
    return componentEncodes;
  }

  getMessageHash(node, round, componentEncodes) {
    var encodePackedStr = "";
    for (var item of componentEncodes) {
      encodePackedStr = Web3.utils.encodePacked(encodePackedStr, item);
    }
    encodePackedStr = Web3.utils.encodePacked(node, round, encodePackedStr);
    var messageHash = Web3.utils.keccak256(encodePackedStr);
    return messageHash;
  }

  async getComponentData(componentAddress, entityId, params) {

    var componentContract = new this.web3.eth.Contract(
      ComponentABI,
      componentAddress
    );


    var componentTypes = await componentContract.methods.types().call();
        
    var componentData;

    var paramType = "";

    if (componentTypes[1].length != 0) {
      var paramType = Types[componentTypes[1]];

      var parmasEncode = this.web3.eth.abi.encodeParameters(
        [paramType],
        [params]
      );

      componentData = await componentContract.methods
        .get(entityId, parmasEncode)
        .call();
    } else {
      componentData = await componentContract.methods.get(entityId).call();
    }

    var dataType = [];
    for (var item of componentTypes[0]) {
      dataType.push(Types[item.toString()]);
    }

    var dataDecode = this.web3.eth.abi.decodeParameters(
      dataType,
      componentData
    );
    var data = [];

    for (var y = 0; y < dataType.length; y++) {
      data.push(dataDecode[y].toString());
    }

    return {
      componentAddress: componentAddress,
      entity: entityId,
      paramType: paramType,
      paramValue: params,
      dataType: dataType,
      data: data,
    };
  }

  addPostList(componentAddress,entityId,data){

    var postDataEncode=this.web3.eth.abi.encodeParameters(
        ["address","uint256","bytes"],
        [componentAddress,entityId,data]
    );
    this.postList.push(postDataEncode);


  }


  async postComponentDataByPrivateKey(systemAddress,privateKey) {

    this.web3.eth.accounts.wallet.add(privateKey);


    var address=this.web3.eth.accounts.privateKeyToAccount(privateKey).address

    var systemContract = new this.web3.eth.Contract(
        SystemABI,
        systemAddress
    );

    const gasPrice = await this.web3.eth.getGasPrice();
    const gas = await systemContract.methods.setData(this.postList).estimateGas({ from: address });

    var result = await systemContract.methods
      .setData(this.postList)
      .send({ from:address ,gasPrice,gas})
      .on("transactionHash", function (hash) {
        console.info(hash);
      })
      .on("receipt", function (receipt) {
        console.log("receipt", receipt);
        return receipt;
      });

    return result;
  }


  
}
export default ECSDK;
