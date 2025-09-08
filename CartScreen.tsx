// React and Redux
import React, {Component, RefObject, createRef} from 'react';
import {connect} from 'react-redux';

// React Native UI
import {
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView as SafeAreaViewIOS,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

// Styles and Colors
import styles from '../../styles/theme/cart/Cart';
import {colors} from '../../styles/index';

// Localisation
import {translate} from '../../localisation';

// Redux Actions
import {
  getCart,
  updateCartItemQuantity,
  removeCartItem,
  customerUpdateOnCart,
  removeFromCart,
} from '../../actions/Cart';
import {createCheckout} from '../../actions/Checkout';
import {currentScreen} from '../../actions/Users/User';

// Components
import QuantityView from '../../components/QuantityView';
import ViewEmpty from '../../components/ViewEmpty';
import CartItem from '../../components/CartItem';
import CartHeader from '../../components/CartHeader';
import CartOrderView from '../../components/CartOrderView';
import CustomAlertModal from '../../components/CustomAlertModal';
import {Container} from '../../components/index';

// Assets
import EmptyImage from '../../assets/images/svg/empty_cart.svg';

// Constants and Types
import {QtyUpdate, productStock, DetailParent} from '../../constants/AppEnum';
import {DEFAULT_CURRENCY} from '../../constants/Constants';
import {IStoreData, PropsCart} from '../../@types/index';
import {IOrderLineItemEdge, IProfile} from '../../reducers/User';
import {ISetIcons, IThemeItem} from '../../reducers/Theme';
import {IRemoteData, IRootState} from '../../@types/state_typex';
import {ICart, ICartAttributes, IEstimateCost} from '../../reducers/Cart';

// Shopify Utils
import {getAppName, getRemoteConfigPrefix} from '../../shopify/StoreDataUtil';

// Utilities
import {
  checkNetwork,
  showToastMsg,
  doLogEvent,
  stringifyWithoutQuotes,
} from '../../utils/Common';

interface Image {
  id: string;
  originalSrc: string;
}

interface Price {
  amount: string;
  currencyCode: string;
}

interface Merchandise {
  id: string;
  title: string;
  price: Price;
  quantityAvailable: number;
  image: Image;
}

interface Node {
  id: string;
  quantity: number;
  merchandise: Merchandise;
  attributes: ICartAttributes[];
}

interface SelectedItem {
  node: Node;
  status: string;
}

interface CartItem {
  variantId: string;
  quantity: number;
}

interface Props extends PropsCart {
  getCart: (id: string) => Promise<any>;
  createCheckout: (cartItems: string) => Promise<any>;
  customerUpdateOnCart: (
    id: string,
    token: string,
    buyerIdentity: any,
  ) => Promise<any>;
  removeFromCart: () => void;
  updateCartItemQuantity: (
    cartID: string,
    lineId: string,
    variantID: string,
    quantity: string,
    attributes: ICartAttributes[],
  ) => Promise<any>;
  removeCartItem: (cartId: string, id: string) => Promise<any>;
  currentScreen: (routeName: string) => void;
  cart: ICart;
  cartItem: any;
  estimatedCost: IEstimateCost;
  cartId: string;
  setIcons: ISetIcons;
  accessToken: string;
  profile?: IProfile;
  theme: IThemeItem[];
  storeData: IStoreData;
  storeRemoteConfig: IRemoteData | any;
}

interface States {
  cart: ICart | undefined;
  arrCart: {}[];
  selectedItem: IOrderLineItemEdge | undefined;
  quantity: number;
  availableQty: number;
  qtyToPass: number | undefined;
  currentQty: number;
  isShowQtyView: boolean;
  isCheckout: boolean;
  estimatedCost: IEstimateCost | undefined;
  isDeleteAPICalling: boolean;
  isLoading: boolean;
  isAllDataFetched: boolean;
  isGuestCheckout: boolean;
  is_inventory: number;
  is_alertModalOpen: boolean;
  modal_message: string;
  orderList_item: IOrderLineItemEdge | any;
  modelType: string;
}

class CartScreen extends Component<Props, States> {
  flatListRef: RefObject<FlatList> = createRef<FlatList>();
  private focusListener: (() => void) | null = null;
  constructor(props: Props) {
    super(props);
    this.state = {
      cart: props.cart ? props.cart : undefined,
      arrCart: props.cartItem ? props.cartItem : [],
      selectedItem: undefined,
      quantity: 0,
      availableQty: 0,
      qtyToPass: undefined,
      currentQty: 0,
      isShowQtyView: false,
      isCheckout: true,
      estimatedCost: props.estimatedCost ? props.estimatedCost : undefined,
      isDeleteAPICalling: false,
      isLoading: false,
      isAllDataFetched: false,
      isGuestCheckout: props.storeData.isGuestCheckout ?? true,
      is_inventory: props?.storeData?.is_inventory ?? 1,
      is_alertModalOpen: false,
      orderList_item: {},
      modal_message: '',
      modelType: '',
    };
  }

  async componentDidMount() {
    const {navigation, route} = this.props;

    this.focusListener = navigation.addListener('focus', () => {
      if (route.name.toLowerCase() === 'cart') {
        this.CallAPIGetCartData();
      }
    });
    // }
  }

  componentWillUnmount() {
    if (this.focusListener) {
      this.focusListener();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.cartItem !== prevProps.cartItem) {
      if (this.props.cartItem) {
        this.setState({arrCart: this.props.cartItem});
      } else {
        this.setState({arrCart: []});
      }
    }
  }

  async verifyItemOrGet(strQuery: string) {
    const {is_inventory} = this.state;
    let result = await checkNetwork();
    if (!result) {
      return;
    }
    this.setState({isLoading: true});
    let id = this.props.cartId;
    if (id !== null) {
      this.props
        .getCart(id)
        .then(jsonDATA => {
          if (jsonDATA) {
            let cart: ICart = jsonDATA.data.cart;
            if (cart) {
              let edges: IOrderLineItemEdge[] = cart.lines.edges;
              if (edges.length > 0) {
                if (is_inventory ? this.checkQuantityAvailable(edges) : true) {
                  this.setState({isLoading: false});
                  let uri = cart.checkoutUrl;

                  if (this.props.storeData?.is_discount_screen) {
                    this.props.navigation.navigate('DiscountCode', {
                      params: {
                        checkout: cart,
                        uri,
                        themeColor: this.props.theme,
                        setIcons: this.props.setIcons,
                      },
                    });
                  } else {
                    this.props.navigation.navigate('PaymentWeb', {
                      params: {
                        uri,
                        themeColor: this.props.theme,
                        setIcons: this.props.setIcons,
                      },
                    });
                  }
                } else {
                  this.setState({isLoading: false});
                }
              } else {
                this.setState({isLoading: false});
              }
            } else {
              this.setState({isLoading: false});
            }
          } else {
            this.setState({isLoading: false});
          }
        })
        .catch(error => {
          this.setState({isDeleteAPICalling: false, isLoading: false});
        });
    }
  }

  async CallAPIGetCartData() {
    const {is_inventory} = this.state;
    let result = await checkNetwork();
    if (!result) {
      return;
    }
    let id = this.props.cartId;
    if (id !== null) {
      this.props
        .getCart(id)
        .then(json => {
          this.setState({isDeleteAPICalling: false});
          if (json) {
            let cart: ICart = json.data.cart;
            if (cart) {
              let edges = cart.lines.edges;
              let estimatedCost: IEstimateCost = cart.cost;

              this.setState({cart: cart, estimatedCost: estimatedCost});

              if (is_inventory) {
                this.checkQuantityAvailable(edges);
              }

              //UPDATE BUYER IN CART
              let buyerIdentity = cart.buyerIdentity;
              let customer = buyerIdentity.customer;
              if (customer === null) {
                this.CallAPIUpdateCustomerInCart();
              }
            } else {
              this.props.removeFromCart();
            }
          } else {
            this.props.removeFromCart();
          }
        })
        .catch(error => {
          this.setState({isDeleteAPICalling: false});
        });
    }
  }

  async CallAPIUpdateCustomerInCart() {
    let result = await checkNetwork();
    if (!result) {
      return;
    }
    let id = this.props.cartId;
    let token = this.props.accessToken;
    let profile = this.props.profile;
    if (profile == null) {
      return;
    }
    let buyerIdentity = {email: profile.email, phone: profile.phone};
    if (id !== null) {
      this.props
        .customerUpdateOnCart(id, token, buyerIdentity)
        .then(json => {
          this.setState({isDeleteAPICalling: false});
        })
        .catch(error => {
          this.setState({isDeleteAPICalling: false});
        });
    }
  }

  async callAPICartUpdate(
    id: string,
    variantID: string,
    quantity: string,
    attributes: ICartAttributes[],
  ) {
    let result = await checkNetwork();
    if (!result) {
      return;
    }
    const updatedJsonArray = attributes.map(item => {
      if (item.key === 'Quantity') {
        return {...item, value: quantity};
      }
      return item;
    });
    this.props
      .updateCartItemQuantity(
        this.props.cartId,
        id,
        variantID,
        quantity,
        updatedJsonArray,
      )
      .then(json => {
        this.CallAPIGetCartData();
        this.setState({
          isShowQtyView: false,
        });
        const title = attributes.find(item => item.key === 'title');
        doLogEvent('update_cartItem_quantity', {
          product_name: title?.value ?? '',
        });
      })
      .catch(error => {
        this.setState({
          isShowQtyView: false,
        });
      });
  }

  callAPICreateCheckout = async () => {
    let result = await checkNetwork();
    if (!result) {
      return;
    }

    let items: any[] = [];
    let itemTotal: number = 0;
    let currencyCode: string = '';
    let arrTemp = this.state.cart?.lines.edges ?? [];

    let strQuery = '';
    arrTemp.forEach(element => {
      let id = element.node.merchandise.id;
      let quantity = element.node.quantity;
      let attributes = element.node.attributes;
      if (strQuery === '') {
        strQuery = `{ variantId: "${id}", quantity: ${quantity},customAttributes:${stringifyWithoutQuotes(
          attributes,
        )} }`;
      } else {
        strQuery =
          strQuery +
          ', ' +
          `{ variantId: "${id}", quantity: ${quantity}, customAttributes:${stringifyWithoutQuotes(
            attributes,
          )} }`;
      }
      const productItem = {
        item_id: element.node.merchandise.id,
        item_name: element.node.merchandise.title,
        item_brand: getAppName(),
        item_quantity: element.node.quantity,
        item_revenue: parseFloat(
          element.node.merchandise.price.amount.replace(/[^\d.]/g, ''),
        ),
        quantity: element.node.quantity,
        revenue: parseFloat(
          element.node.merchandise.price.amount.replace(/[^\d.]/g, ''),
        ),
        price: parseFloat(
          element.node.merchandise.price.amount.replace(/[^\d.]/g, ''),
        ),
        item_price: parseFloat(
          element.node.merchandise.price.amount.replace(/[^\d.]/g, ''),
        ),
        currency: element.node.merchandise.price.currencyCode,
      };
      items.push(productItem);
      let priceFloot = parseFloat(
        element.node.merchandise.price.amount.replace(/[^\d.]/g, ''),
      );
      itemTotal = itemTotal + priceFloot * element.node.quantity;
      currencyCode = element.node.merchandise.price.currencyCode;
    });
    doLogEvent('begin_checkout', {
      items: items, // Array of item IDs being checked out
      totalPrice: itemTotal, // Total price of the items
      value: itemTotal, // Total price of the items
      currency: currencyCode, // Currency used for the transaction
      // Other relevant parameters...
    });
    this.verifyItemOrGet(strQuery);
  };

  checkQuantityAvailable = (arr: IOrderLineItemEdge[]) => {
    let temp: any[] = [];
    let isCheckout = true;
    if (arr.length > 0) {
      temp = arr.filter(function (item) {
        const dic = item;
        let qty = item.node.quantity;
        let quantityAvailable = item.node.merchandise.quantityAvailable;
        if (quantityAvailable <= 0) {
          dic.status = productStock.outOfStock;
          isCheckout = false;
        } else if (qty > quantityAvailable) {
          dic.status = productStock.lessQuantity;
          isCheckout = false;
        } else {
          dic.status = productStock.available;
        }
        return dic;
      });
      this.setState({isCheckout: isCheckout, arrCart: temp});
    } else {
      this.setState({arrCart: temp});
    }
    return isCheckout;
  };

  actionUpdateQuantity = (type: string) => {
    const {selectedItem, is_inventory} = this.state;

    let quantityAvailable =
      selectedItem?.node.merchandise.quantityAvailable ?? 0;

    let quantity = this.state.quantity;
    const availableQty = this.state.availableQty;
    let qtyToPass = this.state.qtyToPass;

    if (type === QtyUpdate.plus) {
      if (is_inventory ? quantity < quantityAvailable : true) {
        quantity = quantity + 1;

        if (qtyToPass !== undefined) {
          qtyToPass = qtyToPass - 1;
        }
      } else {
        //check available quantity for sale
        if (qtyToPass === 0) {
          showToastMsg(translate('cart.errorLessQty'), true);
        } else {
          showToastMsg(translate('cart.errorLimit'), true);
        }
      }
    } else {
      if (quantity > 1) {
        quantity = quantity - 1;
        if (quantity >= quantityAvailable) {
          qtyToPass = 0;
        } else {
          if (qtyToPass !== undefined) {
            qtyToPass = qtyToPass + 1;
          }
        }
      }
    }
    if (qtyToPass !== undefined) {
      this.setState({qtyToPass: qtyToPass});
    }

    this.setState({quantity: quantity, availableQty: availableQty});
  };

  updateQuantity = (value: string) => {
    if (value.length <= 0 || parseInt(value) <= 0) {
      this.setState({quantity: 1});
      return;
    }
    if (parseInt(value) < 0) {
      return;
    }
    this.setState({quantity: parseInt(value)});
  };

  actionUpdateCartItem = () => {
    const {selectedItem} = this.state;
    const quantity = this.state.quantity;

    let variantID = selectedItem?.node.merchandise.id ?? '';
    let id = selectedItem?.node.id ?? '';
    let attributes = selectedItem?.node.attributes ?? [];

    this.callAPICartUpdate(id, variantID, quantity.toString(), attributes);
  };

  actionDeleteCart = (value: IOrderLineItemEdge) => {
    this.setState({
      is_alertModalOpen: true,
      modelType: 'delete_item',
      modal_message: translate('cart.delete_message'),
      orderList_item: value,
    });
  };

  confirmDelete = async () => {
    const {orderList_item} = this.state;
    await this.actionRemove(orderList_item);
    this.setState({is_alertModalOpen: false});
  };
  actionRemove = async (item: IOrderLineItemEdge) => {
    if (this.state.isDeleteAPICalling) {
      return;
    }
    let result = await checkNetwork();
    if (!result) {
      return;
    }

    this.setState({
      isDeleteAPICalling: true,
      isLoading: true,
    });
    let id = item.node.id;
    this.props
      .removeCartItem(this.props.cartId, id)
      .then(json => {
        let items: any[] = [];
        let itemTotal: number = 0;
        let currencyCode: string = '';
        const productItem = {
          item_id: item.node.merchandise.id,
          item_name: item.node.merchandise.title,
          item_brand: getAppName(),
          item_quantity: item.node.quantity,
          item_revenue: parseFloat(
            item.node.merchandise.price.amount.replace(/[^\d.]/g, ''),
          ),
          quantity: item.node.quantity,
          revenue: parseFloat(
            item.node.merchandise.price.amount.replace(/[^\d.]/g, ''),
          ),
          price: parseFloat(
            item.node.merchandise.price.amount.replace(/[^\d.]/g, ''),
          ),
          item_price: parseFloat(
            item.node.merchandise.price.amount.replace(/[^\d.]/g, ''),
          ),
          currency: item.node.merchandise.price.currencyCode,
        };
        items.push(productItem);
        let priceFloot = parseFloat(
          item.node.merchandise.price.amount.replace(/[^\d.]/g, ''),
        );
        itemTotal = itemTotal + priceFloot * item.node.quantity;
        currencyCode = item.node.merchandise.price.currencyCode;
        doLogEvent('remove_from_cart', {
          items: items, // Array of item IDs being checked out
          totalPrice: itemTotal, // Total price of the items
          value: itemTotal, // Total price of the items
          currency: currencyCode, // Currency used for the transaction
          // Other relevant parameters...
        });
        this.setState({isLoading: false}, () => {
          this.CallAPIGetCartData();
        });
      })
      .catch(error => {
        this.setState({
          isDeleteAPICalling: false,
          isLoading: false,
        });
      });
  };

  actionCloseQtyView = () => {
    this.setState({isShowQtyView: false});
  };

  actionViewProducts = () => {
    this.props.navigation.navigate('Category');
  };

  actionQuantityView = (item: IOrderLineItemEdge, strQuantity: number) => {
    let qty = item.node.merchandise.quantityAvailable;

    let newQty: number = 0;
    if (strQuantity > qty) {
      this.setState({qtyToPass: undefined});
    } else {
      newQty = qty - strQuantity;
      this.setState({qtyToPass: newQty});
    }

    this.setState({
      selectedItem: item,
      quantity: strQuantity,
      isShowQtyView: true,
    });
  };

  askBeforePayment = () => {
    // This condition indicates whether the store is in demo mode or live.

    if (
      JSON.parse(
        this.props.storeRemoteConfig[`${getRemoteConfigPrefix()}_574`]?._value,
      )
    ) {
      this.actionConfirmOrder();
    } else {
      this.setState({
        is_alertModalOpen: true,
        modelType: 'goToCheckout',
        modal_message:
          '⚠️ This is a Demo Store: \n\nYour order will not be processed. This checkout is for testing purposes only. Please do not enter real payment information.',
      });
    }
  };

  actionConfirmOrder = async () => {
    if (this.state.isDeleteAPICalling || this.state.isLoading) {
      return;
    }
    let result = await checkNetwork();
    if (!result) {
      return;
    }
    this.setState({is_alertModalOpen: false});
    let token = this.props.accessToken;
    if (this.state.isGuestCheckout) {
      this.callAPICreateCheckout();
    } else {
      if (token != null) {
        this.callAPICreateCheckout();
      } else {
        this.props.currentScreen(this.props.route.name);
        this.props.navigation.navigate('AuthenticationStack', {
          screen: 'Login',
          params: {
            params: {
              themeColor: this.props.theme,
              setIcons: this.props.setIcons,
            },
          },
        });
      }
    }
  };

  actionViewSummery = () => {
    this.flatListRef.current?.scrollToEnd();
  };

  actionProductDetail = (item: IOrderLineItemEdge) => {
    const {attributes, merchandise} = item.node;
    let prodID = attributes.find(data => data.key === 'id')?.value;
    let title = attributes.find(data => data.key === 'title')?.value;
    this.props.navigation.navigate('ProductDetails', {
      params: {
        prodID: prodID,
        variantID: merchandise.id,
        DetailParent: DetailParent.Cart,
        title: title,
        themeColor: this.props.theme,
        setIcons: this.props.setIcons,
      },
    });
  };

  confirmScreen = (type: any) => {
    if (type == 'delete_item') {
      this.confirmDelete();
    } else {
      this.actionConfirmOrder();
    }
  };

  render() {
    const {
      isShowQtyView,
      arrCart,
      quantity,
      isAllDataFetched,
      isCheckout,
      estimatedCost,
      qtyToPass,
    } = this.state;
    let isNoCart = 0;
    if (this.props.cartItem !== null) {
      isNoCart = this.props.cartItem.length || 0;
    }

    return (
      <View style={[styles.container]}>
        <View style={[styles.container]}>
          <View style={[styles.container, {marginHorizontal: 10}]}>
            <FlatList
              data={arrCart}
              extraData={arrCart}
              showsVerticalScrollIndicator={false}
              ref={this.flatListRef}
              keyExtractor={(item, index) => index.toString()}
              refreshing={false}
              renderItem={({item, index}) => {
                return (
                  <TouchableOpacity
                    disabled
                    activeOpacity={1}
                    onPress={() => {
                      this.actionProductDetail(item);
                    }}>
                    <CartItem
                      item={item}
                      currency={
                        estimatedCost?.totalAmount?.currencyCode ??
                        DEFAULT_CURRENCY
                      }
                      actionQty={(objItem, strQuantity) => {
                        this.actionQuantityView(objItem, strQuantity);
                      }}
                      actionRemove={removeItem => {
                        this.actionDeleteCart(removeItem);
                      }}
                    />
                  </TouchableOpacity>
                );
              }}
              ListHeaderComponent={() => {
                return !isCheckout ? <CartHeader /> : null;
              }}
              onNextPageLoad={nextPage => {}}
              loaderSize="small"
              isAllDataFetched={isAllDataFetched}
            />
          </View>

          {isNoCart > 0 && (
            <CartOrderView
              textLabel={translate('cart.bagTotal')}
              label={translate('cart.checkout')}
              price={estimatedCost?.checkoutChargeAmount}
              actionSummery={this.actionViewSummery}
              actionOrder={this.askBeforePayment}
              isBtnEnabled={isCheckout}
              containerStyle={[styles.orderView]}
              isLoading={this.state.isLoading}
            />
          )}

          <QuantityView
            isShowQtyView={isShowQtyView}
            quantityAvailable={this.state.selectedItem}
            quantity={quantity}
            qtyToPass={qtyToPass}
            actionClose={this.actionCloseQtyView}
            actionQuantity={value => {
              this.actionUpdateQuantity(value);
            }}
            actionUpdate={this.actionUpdateCartItem}
            actionChangeQuantity={value => {
              this.updateQuantity(value);
            }}
            theme={this.props.theme}
          />

          {isNoCart <= 0 && (
            <SafeAreaView
              style={[{height: '100%', backgroundColor: colors.WHITE}]}
              edges={['top']}>
              <ViewEmpty
                title={translate('cart.emptyTitle')}
                onPress={this.actionViewProducts}
                SVGImg={EmptyImage}
                btTitle={translate('cart.btn')}
                desc={translate('cart.cartEmpty')}
              />
            </SafeAreaView>
          )}
        </View>

        <CustomAlertModal
          visible={this.state.is_alertModalOpen}
          message={this.state.modal_message}
          onCancel={() => {
            this.setState({is_alertModalOpen: false});
          }}
          onConfirm={() => {
            this.confirmScreen(this.state.modelType);
          }}
        />
      </View>
    );
  }
}

const mapStateToProps = (state: IRootState) => ({
  cartId: state.cart.cartId,
  cart: state.cart.cart,
  cartItem: state.cart.cartItem,
  estimatedCost: state.cart.estimatedCost,
  accessToken: state.user.accessToken,
  profile: state.user.profile,
  theme: state.theme.theme,
  layouts: state.layouts.layouts,
  setIcons: state.theme.setIcons,
  storeData: state.storeData.storeData,
  storeRemoteConfig: state.remoteConfigData.storeRemoteConfig,
});

const mapDispatchToProps = (dispatch: any) => ({
  currentScreen: (params: string) => dispatch(currentScreen(params)),
  createCheckout: (arrItem: string) => dispatch(createCheckout(arrItem)),
  getCart: (cartID: string) => dispatch(getCart(cartID)),
  removeFromCart: () => dispatch(removeFromCart()),
  removeCartItem: (cartID: string, lineId: string) =>
    dispatch(removeCartItem(cartID, lineId)),
  customerUpdateOnCart: (cartID: string, token: string, buyerIdentity: any) =>
    dispatch(customerUpdateOnCart(cartID, token, buyerIdentity)),
  updateCartItemQuantity: (
    cartID: string,
    lineId: string,
    variantID: string,
    quantity: string,
    attributes: ICartAttributes[],
  ) =>
    dispatch(
      updateCartItemQuantity(cartID, lineId, variantID, quantity, attributes),
    ),
});
export default connect(mapStateToProps, mapDispatchToProps)(CartScreen);
