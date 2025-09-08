// React and React Native Imports
import React, {Component, PureComponent, RefObject, createRef} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {connect} from 'react-redux';
import Share, {ShareOptions} from 'react-native-share';
import getSymbolFromCurrency from 'currency-symbol-map';
import {isEmpty} from 'lodash';

// Constants and Types
import {IStoreData, PropsProductDetail} from '../../@types';
import {IProfile} from '../../reducers/User';
import {IUploadImageItem} from '../../reducers/Product';
import {ICartAttributes} from '../../reducers/Cart';
import {IProductInfo} from '../../reducers/Product';
import {IWishListItem} from '../../reducers/Wishlist';
import {IThemeItem} from '../../reducers/Theme';
import {ISetIcons} from '../../reducers/Theme';
import {IImageUpload} from '../../components/ImageUploader';
import {IImageSelectItem} from '../../components/ImageSelector';

// Constants
import {CHARACTER_LENGTH, CUSTOMER_INVALID, DEFAULT_CURRENCY, IS_SHOW_BUY_NOW} from '../../constants/Constants';
import {DetailParent, QtyUpdate} from '../../constants/AppEnum';
import Assets from '../../constants/Assets';

// Actions
import {
  addLocalWishList,
  addToWishlist,
  removeFromWishlist,
  updateFromWishlist,
} from '../../actions/Users/Wishlist';
import {
  addToCart,
  buyNowProduct,
  doCreateProductVariant,
  getCart,
  updateCart,
  updateCartItemQuantity,
} from '../../actions/Cart';
import {
  doUploadImage,
  product,
  doStagedUploadsCreate,
} from '../../actions/Product';
import {recommendationProducts} from '../../actions/RecommendationProducts';
import {setUploadedImages} from '../../store/actions/Products';

// Utils
import {
  checkNetwork,
  compareArraysByImageUrl,
  doLogEvent,
  getBaseDecodeId,
  getCurrencyCode,
  isLightColor,
  isShowWishListPlanWise,
  showToastMsg,
} from '../../utils/Common';
import {compareTwoSingleArray, isColorCode} from '../../utils/Validator';
import {iosPlatform, isIpad} from '../../utils/Platform';
import {showSimpleDialogMessage, showToast} from '../../utils/Alert';
import {
  getComponentTag,
  getMultipleImageCount,
  isAllowImageUploading,
  isSupportMultipleImage,
} from '../../utils/CategoryUtil';

// Components
import BadgeIcon from '../../components/BadgeIcon';
import FullScreenImage from '../../components/FullScreenImage';
import ImageSlider from '../../components/ImageSlider';
import Indicator from '../../components/Indicator';
import Loader from '../../components/Loader';
import ProductOption from '../../components/ProductOption';
import TitleDetailsView from '../../components/TitleDetailsView';
import CollectionListItem from '../../components/CollectionListItem';
import {Button, Container} from '../../components';
import ProductDetailComponents, {
  COMPONENT_TYPES,
} from '../../components/ProductDetailComponents';
import WebDisplay from '../../components/WebDisplay';

// Assets
import CART from '../../assets/images/svg/cart.svg';
import WISHLIST from '../../assets/images/svg/wishlist_white.svg';
import Like from '../../assets/images/svg/like.svg';
import NotLike from '../../assets/images/svg/not_like.svg';

// Styles and i18n
import {colors} from '../../styles/Colors';
import styles from '../../styles/theme/product/ProductDetails';
import {translate} from '../../localisation';
import WishlistBadge from '../../components/WishlistBadge';
import FontsSize from '../../styles/FontsSize';
import {
  getAppName,
  getCalculatedPrice,
  getProductImagesRatio,
  getSelectedImage,
  isProductImagesSqure,
  isProductNameCapital,
  isUpdateQtyOrUpdateCart,
} from '../../shopify/StoreDataUtil';
import {ISetIcons, IThemeItem} from '../../reducers/Theme';
import {IRootState} from '../../@types/state_typex';
import {IProductInfo, IWishListItem} from '../../reducers/Wishlist';

/**
 * Component props interface
 */
interface Props extends PropsProductDetail {
  // Cart related props
  cartItem: any[];
  cartId: string | undefined | null;
  
  // Wishlist related props
  wishlist: IWishListItem[];
  accessToken: string;
  
  // API callbacks
  product: (id: string) => Promise<IProductInfo>;
  recommendationProducts: (id: string) => Promise<any>;
  
  // Cart actions
  addToCart: (
    customerAccessToken: string,
    attributes: ICartAttributes[],
    quantity: string,
    variantID: string,
    profile?: IProfile,
    isBuyNow?: boolean,
  ) => Promise<any>;
  updateCart: (
    cartID: string,
    attributes: ICartAttributes[],
    quantity: string,
    variantID: string,
  ) => Promise<any>;
  updateCartItemQuantity: (
    cartID: string,
    lineId: string,
    variantID: string,
    quantity: string,
    attributes: ICartAttributes[],
  ) => Promise<any>;
  
  // Wishlist actions
  addToWishlist: (customerId: string, productId: string) => Promise<any>;
  addLocalWishList: (products: IWishListItem[]) => Promise<any>;
  removeFromWishlist: (customerId: string, productId: string) => Promise<any>;
  
  // Image handling
  doUploadImage: (imagePath: string) => Promise<any>;
  doStagedUploadsCreate: (
    imagePath: string,
    callback: () => void,
    onError: (error: {message: string}) => void,
  ) => Promise<any>;
  setUploadedImages: (imagePaths: IUploadImageItem[]) => Promise<any>;
  
  // Product variant
  doCreateProductVariant: (
    price: string,
    productId: string,
    optionsTitle: string,
  ) => Promise<any>;
  
  // User and theme
  profile?: IProfile;
  theme: IThemeItem[];
  setIcons: ISetIcons;
  
  // Store data
  storeData: IStoreData;
  
  // Navigation
  navigationRef: any;
  
  // Other
  message: string;
  uploadedImages: IUploadImageItem[];
}

/**
 * Component state interface
 */
interface State {
  // Loading states
  isLoading: boolean;
  isImageUploading: boolean;
  isAddToCartLoading: boolean;
  isBuyNowLoading: boolean;
  isWishlistAPICalling: boolean;
  isFavoriteLoader: boolean;
  isLoadError: boolean;
  
  // Product data
  product: IProductInfo | undefined;
  productTitle: string;
  productImages: any[];
  productOptions: any[];
  productVariants: any[];
  productVariantOptions: any[];
  recommendationList: any[];
  
  // Selection states
  selectedItem: any;
  selectedVariantID: string;
  selectedVariantIdList: any[];
  selectedPrice: string;
  selectedIndex: number;
  selectPriceIndex: number;
  
  // UI states
  isAvailableForSale: boolean;
  isAddTocart: boolean;
  isSelected: boolean;
  isUnavailable: boolean;
  isLinkOpen: boolean;
  isPreventMultiple: boolean;
  isFullScreen: boolean;
  isReadMore: boolean;
  isMultipleImage: boolean;
  
  // Navigation and display
  fromScreen: string;
  parent: string;
  visibleIndex: number;
  initialImageScrollIndex: number;
  
  // Product details
  currencyCode: string;
  availableQty: number;
  product_quantity: number;
  is_inventory: number;
  
  // Image handling
  selectedImage: IImageSelectItem | undefined;
  maximumImages: number;
  
  // Custom fields
  shortMessage: string;
  customName: string;
  customTitle: string;
  customContent: string;
  contactNo: string;
  textArea: {label: string; value: string};
  
  // Measurement fields
  wInch: {id: string; value: string};
  hInch: {id: string; value: string};
  wFoot: {id: string; value: string};
  hFoot: {id: string; value: string};
  
  // Other
  buttonColor: string;
  multipleVariantCombination: {[key: string]: any[]};
  Combination: any[];
  calulcatedPrice: string;
  currentRemoveIndex: number;
  accessToken: string;
  productId: string;
}

class ProductDetailsScreen extends PureComponent<Props, State> {
  static defaultNavigationOptions = ({navigation, route}: Props) => {
    let {themeColor, setIcons, storeData} = route.params.params;
    let SearchPanel = themeColor?.find(
      (value: any) => value?.layoutSlug === 'SearchPanel',
    );

    return {
      headerShown: true,
      headerTitle: () => <View />,
      headerShadowVisible: true,
      headerStyle: {
        bottom: 0,
        backgroundColor: isColorCode(themeColor, 'primary_color', 'WHITE'),
      },
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={
              setIcons?.back_icon ? {uri: setIcons.back_icon} : Assets.ic_back
            }
            style={[
              styles.iconStyle,
              {
                tintColor: isColorCode(themeColor, 'secondary_color', 'BLACK'),
              },
            ]}
          />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View
          style={[
            styles.headerRightContainer,
            {borderColor: isColorCode(themeColor, 'primary_color', 'BLACK')},
          ]}>
          <TouchableOpacity
            style={[styles.iconStyleView]}
            onPress={() => {
              if (route.params.createDeepLinkForProduct) {
                route?.params?.createDeepLinkForProduct(route?.params?.product);
              }
            }}>
            <Image
              source={
                setIcons?.share_invite_friend_icon
                  ? {uri: setIcons?.share_invite_friend_icon}
                  : Assets.icn_share
              }
              style={[
                styles.iconStyle,
                {
                  tintColor: isColorCode(
                    themeColor,
                    'secondary_color',
                    'BLACK',
                  ),
                },
              ]}
            />
          </TouchableOpacity>
          {isShowWishListPlanWise(storeData?.activated_plan_id, false) && (
            <TouchableOpacity
              style={[styles.iconStyleView]}
              onPress={() => route.params.navigationRef.navigate('wishlist')}>
              <WishlistBadge
                icon={
                  setIcons?.wishlistfooter_icon ? (
                    <Image
                      source={{uri: setIcons?.wishlistfooter_icon}}
                      style={[
                        styles.iconStyle,
                        {
                          tintColor: isColorCode(
                            themeColor,
                            'secondary_color',
                            'BLACK',
                          ),
                        },
                      ]}
                    />
                  ) : (
                    <WISHLIST
                      stroke={isColorCode(
                        themeColor,
                        'secondary_color',
                        'BLACK',
                      )}
                      width={isIpad() ? 35 : 24}
                      height={isIpad() ? 35 : 24}
                    />
                  )
                }
                showCount
                countColor={
                  SearchPanel
                    ? SearchPanel?.layoutData?.headerCountTextColor
                    : colors.WHITE
                }
                badgeColor={
                  SearchPanel
                    ? SearchPanel?.layoutData?.headerCountBackgroundColor
                    : colors.RED
                }
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.iconStyleView]}
            onPress={() =>
              route.params.navigationRef.navigate('cart', {
                params: {themeColor: themeColor, setIcons: setIcons},
              })
            }>
            <BadgeIcon
              icon={
                setIcons?.cart_icon ? (
                  <Image
                    source={{uri: setIcons?.cart_icon}}
                    style={[
                      styles.iconStyle,
                      {marginEnd: 0},
                      {
                        tintColor: isColorCode(
                          themeColor,
                          'secondary_color',
                          'BLACK',
                        ),
                      },
                    ]}
                  />
                ) : (
                  <CART
                    stroke={isColorCode(themeColor, 'secondary_color', 'BLACK')}
                    width={isIpad() ? 30 : 24}
                    height={isIpad() ? 30 : 24}
                  />
                )
              }
            />
            {/* )} */}
          </TouchableOpacity>
        </View>
      ),
    };
  };
  scrollViewRef: RefObject<ScrollView> = createRef<ScrollView>();
  _input: RefObject<ScrollView> = createRef<TextInput>();
  flatListRef: RefObject<FlatList> = createRef<FlatList>();
  productPrice: string = '0';
  constructor(props: Props) {
    super(props);

    let paramsFromNav = this.props.route.params.params;

    let parent = paramsFromNav.DetailParent;
    let title: string = '';
    title = this.isScreenValidation() ? '' : paramsFromNav.item?.title ?? '';
    let fromScreen = paramsFromNav.from ?? '';
    let productId = paramsFromNav?.productId ?? '';

    let getTag = this.isScreenValidation()
      ? []
      : props.route.params.params?.item?.tags;
    let componentTag = getComponentTag(getTag ?? []);

    this.state = {
      isLoading: false,
      product: this.isScreenValidation()
        ? undefined
        : props.route.params.params.item,
      productTitle: title,
      productImages: [],
      productOptions: [],
      productVariants: [],
      productVariantOptions: [],
      selectedItem: {},
      selectedPrice: '',
      isAvailableForSale: true,
      initialImageScrollIndex: 0,
      isAddTocart: false, //IS PRODUCT ADDED TO CART?
      currencyCode: '',
      parent: parent, //STORES PARENT SCREEN
      availableQty: 0, //IT STORES AVAILABLE QTY OF PRODUCT
      visibleIndex: 0, //STORES VISIBLE INDEX OF IMAGE
      isFullScreen: false, //IS FULL SCREEN IMAGE OPENED?
      selectedIndex: 0, //IT STORE SELECTED INDEX WHEN USER TAB ON FULL SCREEN IMAGE
      isSelected: false, //IS PRODUCT ADDED WISHLIST ?
      isLoadError: false, // ITS TRUE ONE TIME WHEN ADD TO CART PRESSED AND VARIANT NOT SELECTED
      isWishlistAPICalling: false, //IS WISHLIST API CALL IN PROGRESS?
      isUnavailable: false, // IT IS USED FOR SHOW PRODUCT UNAVAILABLE
      isLinkOpen: false,
      isPreventMultiple: false, // USING FOR PREVENT MULTIPLE CLICK BY USERS
      fromScreen: fromScreen, // USING FOR FROM WHERE PRODUCT DETAIL SCREEN NAVIGATE
      productId: productId,
      selectedVariantID: '', // USING FOR CHECKING AVAILABLE PRODUCT VARIANT's ID QUANTITY
      accessToken: props.accessToken, //USER FOR CUSTOMER ACCESS
      selectedVariantIdList: [], // USING FOR CHECKING AVAILABLE PRODUCT VARIANT QUANTITY
      isReadMore: false,
      recommendationList: [],
      selectPriceIndex: 0,
      multipleVariantCombination: {},
      buttonColor: 'rgba(255,255,255,0.8)',
      is_inventory: props?.storeData?.is_inventory ?? 1,
      isMultipleImage: isSupportMultipleImage(
        this.isScreenValidation()
          ? []
          : props.route.params.params?.item?.tags ?? [],
      ),
      maximumImages: getMultipleImageCount(
        this.isScreenValidation()
          ? []
          : props.route.params.params?.item?.tags ?? [],
      ),
      Combination: [],
      isImageUploading: false,
      wInch: {id: '8', value: '8'},
      hInch: {id: '8', value: '8'},
      wFoot: {id: '1', value: '1'},
      hFoot: {id: '1', value: '1'},
      shortMessage: '',
      contactNo: '',
      customContent: '',
      customName: '',
      customTitle: '',
      textArea: {label: '', value: ''},
      selectedImage: getSelectedImage(componentTag),
      calulcatedPrice: getCalculatedPrice(
        componentTag,
        this.isScreenValidation()
          ? '0'
          : props.route.params.params?.item?.priceRange?.minVariantPrice
              ?.amount ?? '0',
      ),
      isAddToCartLoading: false,
      currentRemoveIndex: -1,
      isFavoriteLoader: false,
      isBuyNowLoading: false,
      product_quantity: 1,
    };
  }

  isScreenValidation = () => {
    return (
      this.props.route.params.params.DetailParent === DetailParent.Cart ||
      this.props.route.params.params.DetailParent === DetailParent.Order
    );
  };

  componentDidMount() {
    const {navigation} = this.props;

    navigation.addListener('focus', async () => {
      this.checkAvailableQty();

      if (this.state.fromScreen && this.state.fromScreen === 'CategoryScreen') {
        let productID =
          getBaseDecodeId(`gid://shopify/Product/${this.state.productId}`) ??
          '';

        this.callAPIGetProduct(productID, true);
      } else {
        if (this.isScreenValidation()) {
          const ProdId = this.props.route.params.params.prodID ?? '';

          this.callAPIGetProduct(ProdId, true);
        } else {
          const ProdId = this.state.product?.id ?? '';

          //REFRESH PRODUCT DATA BY CALLING API
          this.productDetailSetup();
          this.callAPIGetProduct(ProdId, false);
        }
      }
    });
  }

  componentWillUnmount() {
    StatusBar.setHidden(false);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.cartItem !== prevProps.cartItem) {
      this.checkAvailableQty();
    }

    if (this.props.accessToken !== prevProps.accessToken) {
      this.setState({accessToken: this.props.accessToken});
    }
  }

  productDetailSetup() {
    const {is_inventory} = this.state;
    const imageEdges = this.state.product?.images.edges ?? [];
    const options = this.state.product?.options ?? [];
    const variantEdges = this.state.product?.variants.edges ?? [];
    const currencyCode =
      this.state.product?.priceRange.maxVariantPrice.currencyCode ??
      DEFAULT_CURRENCY;

    let arrProduct = this.state.product?.id?.split('/') ?? [];
    let product_ID = arrProduct.pop() ?? 0;
    let isWishList = this.props.wishlist.some(
      item => item.product_id == product_ID,
    );
    let isSelected = isWishList;

    let variantOptions = options.map((itemOption, indexOption) => {
      let selectedValue = '';

      //let availableVariants = variantEdges;
      let availableVariants = variantEdges.filter(variant => {
        return is_inventory ? variant.node.quantityAvailable > 0 : true;
      });

      if (is_inventory ? availableVariants.length > 0 : true) {
        availableVariants[0]?.node?.selectedOptions.forEach(variant => {
          if (variant.name === itemOption.name) {
            if (itemOption.values) {
              itemOption.values.forEach(itemOptionValue => {
                if (variant.value === itemOptionValue) {
                  selectedValue = itemOptionValue;
                }
              });
            }
          }
        });
      }

      let availableData = variantEdges
        .map((_item, _index) => {
          if (
            _item.node.selectedOptions[indexOption].value == selectedValue &&
            _item.node.selectedOptions.length > 1
          ) {
            return _item;
          } else if (_item.node.selectedOptions.length == 1) {
            return _item;
          }
        })
        .filter(item => {
          return item !== undefined;
        });

      return {
        ...itemOption,
        quantityAvailableData: availableData,
        selectedValue: selectedValue,
        errorMassage: null,
      };
    });

    this.getUniqueVariantCombination(variantOptions);
    let indexOfVal = this.state.product?.variants?.edges
      .map((_item1, _index1) => {
        let isSelectedIndex = _item1.node.selectedOptions?.every(
          (_item2, _index2) => {
            return (
              _item2.value ==
              this.state.productVariantOptions[_index2]?.selectedValue
            );
          },
        );

        if (isSelectedIndex) return _index1;
      })
      .filter(item => item);
    this.setState(
      {
        selectPriceIndex: Number(indexOfVal),
        isLoadError: false,
        isSelected,
        currencyCode,
        productOptions: options,
        productImages: [
          ...imageEdges.map((item, index) => {
            return {
              desc: '',
              image: item.node?.originalSrc,
              key: item.node?.id,
            };
          }),
        ],
        productVariants: [
          ...variantEdges.map((item, index) => {
            return {
              ...item.node,
            };
          }),
        ],
        productVariantOptions: [...variantOptions],
      },
      () => {
        //  let availableVariants = variantEdges;
        let availableVariants = variantEdges.filter(variant => {
          return is_inventory ? variant.node.quantityAvailable > 0 : true;
        });
        const imageId =
          availableVariants.length > 0
            ? availableVariants[0]?.node?.image?.id
            : '';

        const imageIndex = imageEdges.findIndex(
          itemImage => imageId === itemImage?.key,
        );

        if (availableVariants.length > 0) {
          availableVariants[0]?.node?.selectedOptions.forEach(option => {
            if (
              this.state.selectedVariantIdList.find(
                item => item.name === option.name,
              )
            ) {
              let index = this.state.selectedVariantIdList.findIndex(
                item => item.name === option.name,
              );
              this.state.selectedVariantIdList[index].value = option.value;
            } else {
              this.state.selectedVariantIdList.push(option);
            }
          });
        }

        this.setState({
          isLoadError: false,
          selectedPrice:
            availableVariants.length > 0
              ? availableVariants[0]?.node.price.amount
              : '',
          selectedItem:
            availableVariants.length > 0 ? availableVariants[0]?.node : {},
          isAvailableForSale:
            availableVariants.length > 0
              ? availableVariants[0]?.node?.availableForSale
              : false,
          isUnavailable: false,
          initialImageScrollIndex: imageIndex < 0 ? 0 : imageIndex,
        });
      },
    );
    let items: any[] = [];
    items.push({
      item_id: this.state.product?.id,
      item_name: this.state.productTitle,
      item_brand: getAppName(),
      item_quantity: 1,
      item_revenue: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
      quantity: 1,
      revenue: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
      price: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
      item_price: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
    });

    doLogEvent('view_item', {
      currency: currencyCode,
      value: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
      items: items,
    });
    this.props.setUploadedImages([]);
  }

  //Compare two array for variant match
  compareArrays(arr1: any[], arr2: any[]) {
    return arr1.every(element => arr2.includes(element));
  }

  //Create Uniqe quantityAvailable for variant
  commonUniqueArray = (variantList: any[], key: string) => {
    return [...variantList]
      .map(_item2 => {
        let data: any[] = [];
        if (_item2.name != key) {
          data = [...data, ..._item2.quantityAvailableData];
        }
        return data;
      })
      .flat(1);
  };

  getUniqueVariantCombination = (variantArray: any) => {
    let productVariantList = JSON.parse(JSON.stringify(variantArray));
    let stateUpdates: any = {};

    // Initialize dynamic arrays for each variant option
    productVariantList.forEach(option => {
      stateUpdates[`${option.name}Combination`] = [];
    });

    productVariantList.forEach((item: any) => {
      if (productVariantList.length > 1) {
        let stringOption = this.findSelectedValue(
          productVariantList,
          item.name,
        );
        let quantityOptionAvailable = this.commonUniqueArray(
          productVariantList,
          item.name,
        );

        //Create dynamic variable name which is use to ProductOption & combination
        stateUpdates[`${item.name}Combination`] = [
          ...new Set(quantityOptionAvailable),
        ].filter((_item, _index) => {
          let string1 = _item.node.title.split(' / ');
          let isTrue = this.compareArrays(stringOption, string1);
          return isTrue && item;
        });
      } else {
        stateUpdates[`${item.name}Combination`] = [
          ...stateUpdates[`${item.name}Combination`],
          ...item.quantityAvailableData,
        ];
      }
    });

    // Set the state dynamically based on the variant options
    this.setState({multipleVariantCombination: stateUpdates});
  };

  findSelectedValue = (variantList: any[], key: string) => {
    return [...variantList]
      .map((_items, _index) => {
        if (_items.name !== key) {
          return _items.selectedValue;
        }
      })
      .filter(_item1 => _item1);
  };

  handelValueChange = (name: string, value) => {
    const {productVariants, productVariantOptions, productImages} = this.state;

    //Create Deep-copy becuse some nested data changes not effect our main array
    let copySelection = JSON.parse(
      JSON.stringify(this.state.selectedVariantIdList),
    );

    if (copySelection.find(item => item.name === name)) {
      let index = copySelection.findIndex(item => item.name === name);

      copySelection[index].value = value;
    } else {
      copySelection.push({name: name, value: value});
    }

    this.setState(
      {
        selectedVariantIdList: copySelection,
        selectedVariantID: value,
        isLoadError: false,
        productVariantOptions: productVariantOptions.map((item, index) => {
          const isDetected = item.name === name;
          if (isDetected) {
            item.selectedValue = value;
          }
          return item;
        }),
      },
      () => {
        this.setState({isLoadError: false});
        let productVariantsIndex = -1;
        productVariants.forEach((item, index) => {
          if (
            compareTwoSingleArray(
              this.state.selectedVariantIdList.map(id => id.value),
              item?.selectedOptions?.map(edge => edge.value),
            )
          ) {
            productVariantsIndex = index;
          }
        });

        let selectedVariant = productVariants[productVariantsIndex];
        if (selectedVariant) {
          const imageId = selectedVariant.image ? selectedVariant.image.id : '';

          const imageIndex = productImages.findIndex(
            itemImage => imageId === itemImage?.key,
          );

          this.setState(
            {
              selectedItem: selectedVariant,
              initialImageScrollIndex: imageIndex < 0 ? 0 : imageIndex,
              selectedPrice: selectedVariant.price.amount,
              isAvailableForSale: selectedVariant.availableForSale,
              isUnavailable: false,
              isAddTocart: false,
            },
            () => {
              this.flatListRef.current?.scrollToIndex({
                animated: false,
                index: this.state.initialImageScrollIndex,
              });
            },
          );
        }

        // THIS WILL USE TO IDENTIFY PRODUCT AVAILABLE OR NOT WITH IMAGE SCROLL TO ATTACHED VARIANT
        if (productImages.length > 0) {
          if (selectedVariant) {
            let findIndex = productImages.findIndex(image => {
              return image?.key === selectedVariant.image.id;
            });

            if (findIndex > -1) {
              this.setState({isUnavailable: false});

              return;
            }
            this.setState({isUnavailable: true});
          }
          // SET TRUE/FALSE FOR PRODUCT IS UNAVAILABLE OR NOT
          if (!this.variantSelectionValidation()) {
            this.setState({isUnavailable: true});
            return;
          }
        }
      },
    );
  };

  //DO GET PRODUCT API CALL AND HANDLE RESPONSE
  async callAPIGetProduct(id: string, isLoader: boolean) {
    let result = await checkNetwork();
    if (!result) {
      return;
    }

    this.doLoading(isLoader);
    Promise.all([this.props.product(id), this.props.recommendationProducts(id)])
      .then(response => {
        this.handleProductResponse(response[0]);
        this.handleRecommendationProduct(response[1]);
      })
      .catch(error => {
        this.doLoading(false);
        showSimpleDialogMessage(error.message, () => {});
      });
  }
  //handle product details response
  handleProductResponse(json: any) {
    const responseProducts: IProductInfo = json.data.product;

    if (responseProducts === null) {
      //CHECK IF IT CAME FROM WISHLIST THEN REMOVE OBJECT FROM WISHLIST
      if (this.state.parent === DetailParent.Wish) {
        this.onPressFavorite(true);
      }
      //SHOW ERROR ALERT
      showSimpleDialogMessage(translate('products.notFound'), () => {
        this.props.navigation.goBack();
      });
    } else {
      this.doLoading(false);

      this.props.navigation.setParams({
        createDeepLinkForProduct: this.createDeepLinkForProduct.bind(this),
        product: responseProducts,
        navigationRef: this.props.navigationRef,
      });
      this.setState(
        {
          productTitle: responseProducts.title,
          product: responseProducts,
          isLoadError: false,
          isMultipleImage: isSupportMultipleImage(responseProducts.tags ?? []),
          maximumImages: getMultipleImageCount(responseProducts.tags ?? []),
        },
        () => this.productDetailSetup(),
      );
    }
  }

  //handle product recommendation response
  handleRecommendationProduct(json: any) {
    const {related_product_count} = this.props.storeData;
    this.doLoading(false);

    let recommendedProduct = json.data.productRecommendations
      ? json.data.productRecommendations.splice(0, related_product_count)
      : [];
    this.setState({recommendationList: recommendedProduct});
  }

  isHeightWidthInchType = (componentType: string) => {
    return (
      componentType === COMPONENT_TYPES.CC_908 ||
      componentType === COMPONENT_TYPES.CC_909 ||
      componentType === COMPONENT_TYPES.CC_914 ||
      componentType === COMPONENT_TYPES.CC_910
    );
  };

  callAPIAddToCart = async (id: string, isBuyNow: boolean) => {
    const {product, productTitle, product_quantity} = this.state;
    let title = productTitle;
    let productVariantId = id;
    let productId;
    if (this.isScreenValidation()) {
      productId = product?.id;
      title = product?.title ?? '';
    } else {
      productId = product?.id;
    }

    let extraCartattributes: ICartAttributes[] = [];
    if (
      isAllowImageUploading(this.state.product?.tags ?? []) &&
      this.props.uploadedImages.length > 0
    ) {
      this.props.uploadedImages.forEach((item, index) => {
        extraCartattributes.push({
          key: `Upload Image ${index + 1}`,
          value: item.imageURL,
        });
      });
    }
    let componentType = getComponentTag(this.state.product?.tags ?? []);

    if (
      this.isHeightWidthInchType(componentType) &&
      this.state.hInch.value.length > 0 &&
      this.state.wInch.value.length > 0
    ) {
      extraCartattributes.push({
        key: `Height(Inch)`,
        value: this.state.hInch.value,
      });
      extraCartattributes.push({
        key: `Width(Inch)`,
        value: this.state.wInch.value,
      });
      let imageSelected = this.state.selectedImage;
      let generatedOptionName = `Width(${this.state.wInch.value}inch)xHeight(${this.state.hInch.value}inch)`;
      if (imageSelected) {
        generatedOptionName = generatedOptionName + `_${imageSelected.key}`;
      }

      const existingProductVariants = this.state.productVariantOptions.find(
        item => item.values.includes(generatedOptionName),
      );

      if (existingProductVariants) {
        const existingVariant =
          existingProductVariants.quantityAvailableData.find(
            item => item.node.title === generatedOptionName,
          );

        if (existingVariant) {
          productVariantId = existingVariant.node.id;
        }
      } else {
        const result = await this.props.doCreateProductVariant(
          this.productPrice,
          this.state.product?.id ?? '',
          generatedOptionName,
        );
        if (result) {
          const {data, errors} = result;
          if (errors && Array.isArray(errors) && errors.length > 0) {
            const {message} = errors[0];
            if (message) {
              showToastMsg(message, true);
            }
            this.setState({isAddToCartLoading: false, isBuyNowLoading: false});
            return;
          }
          if (data) {
            const {productVariantCreate} = data;
            if (productVariantCreate) {
              const {productVariant} = productVariantCreate;
              productVariantId = productVariant.id;
            }
          }
        }
      }
    }
    if (
      componentType === COMPONENT_TYPES.CC_917 &&
      this.state.hFoot.value.length > 0 &&
      this.state.wFoot.value.length > 0
    ) {
      extraCartattributes.push({
        key: `Height(Foot)`,
        value: this.state.hFoot.value,
      });
      extraCartattributes.push({
        key: `Width(Foot)`,
        value: this.state.wFoot.value,
      });

      let imageSelected = this.state.selectedImage;
      let generatedOptionName = `Width(${this.state.wFoot.value}foot)xHeight(${this.state.hFoot.value}foot)`;
      if (imageSelected) {
        generatedOptionName = generatedOptionName + `_${imageSelected.key}`;
      }

      const existingProductVariants = this.state.productVariantOptions.find(
        item => item.values.includes(generatedOptionName),
      );

      if (existingProductVariants) {
        const existingVariant =
          existingProductVariants.quantityAvailableData.find(
            item => item.node.title === generatedOptionName,
          );

        if (existingVariant) {
          productVariantId = existingVariant.node.id;
        }
      } else {
        const result = await this.props.doCreateProductVariant(
          this.productPrice,
          this.state.product?.id ?? '',
          generatedOptionName,
        );
        if (result) {
          const {data} = result;
          if (data) {
            const {productVariantCreate} = data;
            if (productVariantCreate) {
              const {productVariant} = productVariantCreate;
              productVariantId = productVariant.id;
            }
          }
        }
      }
    }

    if (componentType === COMPONENT_TYPES.CC_909 && this.state.selectedImage) {
      extraCartattributes.push({
        key: this.state.selectedImage.key,
        value: this.state.selectedImage.value ?? '',
      });
    }

    if (
      componentType === COMPONENT_TYPES.CC_911 &&
      this.state.shortMessage.trim().length > 0
    ) {
      extraCartattributes.push({
        key: 'Short Message',
        value: this.state.shortMessage,
      });
    }
    if (
      componentType === COMPONENT_TYPES.CC_915 &&
      this.state.contactNo.trim().length > 0
    ) {
      extraCartattributes.push({
        key: 'Contact No',
        value: this.state.contactNo,
      });
    }
    if (
      componentType === COMPONENT_TYPES.CC_915 &&
      this.state.customContent.trim().length > 0
    ) {
      extraCartattributes.push({
        key: 'Content',
        value: this.state.customContent,
      });
    }
    if (
      componentType === COMPONENT_TYPES.CC_911 &&
      this.state.customName.trim().length > 0
    ) {
      extraCartattributes.push({key: 'Name', value: this.state.customName});
    }
    if (
      componentType === COMPONENT_TYPES.CC_915 &&
      this.state.customTitle.trim().length > 0
    ) {
      extraCartattributes.push({key: 'Title', value: this.state.customTitle});
    }
    if (
      componentType === COMPONENT_TYPES.CC_914 &&
      this.state.textArea.value.trim().length > 0
    ) {
      extraCartattributes.push({
        key: this.state.textArea.label,
        value: this.state.textArea.value,
      });
    }
    extraCartattributes.push({key: 'title', value: title});
    extraCartattributes.push({key: 'id', value: productId ?? ''});
    extraCartattributes.push({key: 'Quantity', value: '1'});
    if (this.props.cartId === null || isBuyNow) {
      this.props
        .addToCart(
          this.state.accessToken,
          extraCartattributes,
          product_quantity.toString(),
          productVariantId,
          this.props.profile,
          isBuyNow,
        )
        .then(json => {
          this.setState({
            isAddTocart: true,
            isAddToCartLoading: false,
            isBuyNowLoading: false,
          });
          if (!isBuyNow) {
            this.setState({product_quantity: 1});
          }
          let checkout = json.data.cartCreate.cart;
          if (isBuyNow) {
            this.props.navigation.navigate('PaymentWeb', {
              params: {
                uri: checkout.checkoutUrl,
                themeColor: this.props.theme,
                setIcons: this.props.setIcons,
              },
            });
          }
        })
        .catch(error => {
          this.setState({isAddToCartLoading: false, isBuyNowLoading: false});
          showSimpleDialogMessage(error.message, () => {
            this.doLoading(false);
            if (error.message.includes(CUSTOMER_INVALID)) {
              this.props.navigation.goBack();
            }
          });
        });
    } else {
      let cartItem = this.props.cartItem.find(cart => {
        return cart.node.merchandise.id === productVariantId;
      });

      if (cartItem) {
        const {node} = cartItem;
        const {quantity, merchandise, attributes} = node;
        const uploadImageObject = attributes.find(item =>
          item.key.includes('Upload Image'),
        );

        const localUploadedImageObject = this.props.uploadedImages.find(
          item => item.imageURL === uploadImageObject?.value,
        );
        const filteredData = attributes.filter(item =>
          item.key.includes('Upload Image'),
        );

        const result = await compareArraysByImageUrl(
          filteredData,
          this.props.uploadedImages,
        );

        if ((uploadImageObject && result) || isUpdateQtyOrUpdateCart()) {
          console.log('update cart item quantity >');
          this.props
            .updateCartItemQuantity(
              this.props.cartId ?? '',
              node.id,
              merchandise.id,
              `${Number(quantity) + product_quantity}`,
              extraCartattributes,
            )
            .then(json => {
              this.setState({
                isAddTocart: true,
                isAddToCartLoading: false,
                isBuyNowLoading: false,
                isLoading: false,
              });

              if (!isBuyNow) {
                this.setState({product_quantity: 1});
              }
            })
            .catch(error => {
              this.setState({
                isAddToCartLoading: false,
                isBuyNowLoading: false,
              });
              showSimpleDialogMessage(error.message, () => {
                this.doLoading(false);
              });
            });
        } else {
          console.log('update cart item updateCart >');
          this.props
            .updateCart(
              this.props.cartId ?? '',
              extraCartattributes,
              product_quantity.toString(),
              productVariantId,
            )
            .then(json => {
              this.setState({
                isAddTocart: true,
                isAddToCartLoading: false,
                isBuyNowLoading: false,
              });

              if (!isBuyNow) {
                this.setState({product_quantity: 1});
              }
            })
            .catch(error => {
              this.setState({
                isAddToCartLoading: false,
                isBuyNowLoading: false,
              });
              showSimpleDialogMessage(error.message, () => {
                this.doLoading(false);
              });
            });
        }
      } else {
        console.log('update cart item updateCart 11>');
        this.props
          .updateCart(
            this.props.cartId ?? '',
            extraCartattributes,
            product_quantity.toString(),
            productVariantId,
          )
          .then(json => {
            if (!isBuyNow) {
              this.setState({product_quantity: 1});
            }

            this.setState({
              isAddTocart: true,
              isAddToCartLoading: false,
              isBuyNowLoading: false,
            });
          })
          .catch(error => {
            this.setState({isAddToCartLoading: false, isBuyNowLoading: false});
            showSimpleDialogMessage(error.message, () => {
              this.doLoading(false);
            });
          });
      }
    }
  };

  async createDeepLinkForProduct(product: any) {
    const {onlineStoreUrl, featuredImage} = product;
    const url = onlineStoreUrl;
    if (product === undefined || product === null || url == null) {
      showToast('Product share url not avaliable');
      return;
    }

    doLogEvent('share', {
      item_id: this.state.product?.id,
      content_type: 'product',
      method: 'copy_link',
    });
    const shareTitle = translate('share.shareTitle');
    const shareMessage = translate('share.shareDesc').replace(
      'appName',
      getAppName(),
    );
    const icon = featuredImage.url;
    const options: ShareOptions = Platform.select({
      ios: {
        activityItemSources: [
          {
            // For using custom icon instead of default text icon at share preview when sharing with message.
            placeholderItem: {
              type: 'url',
              content: icon,
            },
            item: {
              default: {
                type: 'text',
                content: `${shareMessage} \n${url}`,
              },
            },
            linkMetadata: {
              title: shareMessage,
              icon: icon,
            },
          },
        ],
      },
      default: {
        shareTitle,
        subject: shareTitle,
        message: `${shareMessage} \n${url}`,
      },
    });

    Share.open(options)
      .then(value => {
        console.log('value', value);
      })
      .catch(error => {
        console.log('error', error);
      });
  }

  async onPressAddToCart(isBuyNow: boolean = false) {
    const {is_inventory} = this.state;
    //CHECK USER CLICK MULTIPLE TIMES
    if (this.state.isPreventMultiple) {
      return;
    }

    //CHECK PRODUCT IS UNAVAILABLE
    if (this.state.isUnavailable) {
      return;
    }
    //CHECK PRODUCT IS AVAILABLE FOR SALE
    if (!this.state.isAvailableForSale) {
      return;
    }
    let result = await checkNetwork();
    if (!result) {
      return;
    }

    //CHECK IF USER HAS SELECTED VARIANTS OR NOT
    if (this.variantSelectionValidation(true)) {
      this.setState({isLoadError: true});
      return false;
    }

    //CHECK IF SELECTED VARIANTS HAVE AVAILABLE QUANTITY OR NOT
    const {isAddTocart, isAvailableForSale, isUnavailable} = this.state;
    if (!isBuyNow) {
      let cartTitle = translate('productDetails.addTocart');
      cartTitle = is_inventory
        ? isUnavailable
          ? translate('productDetails.unavailable')
          : !isAvailableForSale
          ? translate('productDetails.soldOut')
          : isAddTocart
          ? translate('productDetails.viewCart')
          : translate('productDetails.addTocart')
        : isAddTocart
        ? translate('productDetails.viewCart')
        : translate('productDetails.addTocart');

      if (is_inventory) {
        if (
          !this.doCheckItemAvailableQty() &&
          cartTitle === translate('productDetails.addTocart')
        ) {
          showToast(
            'The maximum quantity of this item is already in your cart.',
          );
          return false;
        }
      }
    }
    //TO-DO
    if (
      isAllowImageUploading(this.state.product?.tags ?? []) &&
      this.props.uploadedImages.length < this.state.maximumImages
    ) {
      showToastMsg(translate('cart.imageUpload'), true);
      return;
    }
    let componentType = getComponentTag(this.state.product?.tags ?? []);

    if (componentType === COMPONENT_TYPES.CC_911) {
      if (!this.state.shortMessage.trim()) {
        showToastMsg(translate('productDetails.addSortMessage'), true);
        return;
      } else if (!this.state.customName.trim()) {
        showToastMsg(translate('productDetails.addName'), true);
        return;
      }
    }

    if (componentType === COMPONENT_TYPES.CC_914) {
      if (!this.state.textArea.value.trim()) {
        showToastMsg(translate('productDetails.addTitle'), true);
        return;
      }
    }

    //IF ALREADY ADDED TO CART
    if (this.state.isAddTocart && !isBuyNow) {
      const currencyCode =
        this.state.product?.priceRange.maxVariantPrice.currencyCode ??
        DEFAULT_CURRENCY;

      let items: any[] = [];
      items.push({
        item_id: this.state.product?.id,
        item_name: this.state.productTitle,
        item_brand: getAppName(),
        item_quantity: 1,
        item_revenue: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
        quantity: 1,
        revenue: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
        price: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
        item_price: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
      });
      doLogEvent('add_to_cart', {
        currency: currencyCode,
        items: items,
        value: parseFloat(this.productPrice.replace(/[^\d.]/g, '')) * 1,
      });
      let {themeColor, setIcons} = this.props.route.params.params;
      this.props.navigationRef.navigate('cart', {
        params: {themeColor: themeColor, setIcons: setIcons},
      });
    } else {
      //PERFORM ADD TO CART
      let isEmptyCart = isEmpty(this.state.selectedItem);
      if (isEmptyCart) {
        showSimpleDialogMessage(
          translate('productDetails.unavailable'),
          () => {},
        );
      } else {
        let item = this.state.selectedItem;

        let id = item.id;
        if (isBuyNow) {
          this.setState({isBuyNowLoading: true}, () => {
            this.callAPIAddToCart(id, isBuyNow);
          });
        } else {
          this.setState({isAddToCartLoading: true}, () => {
            this.callAPIAddToCart(id, isBuyNow);
          });
        }
      }
    }
    this.setState({
      isPreventMultiple: true,
    });
    setTimeout(() => {
      this.setState({
        isPreventMultiple: false,
      });
    }, 2000);
  }

  //CHECK IF USER HAS SELECTED VARIANTS OR NOT
  variantSelectionValidation = (isScroll = false) => {
    let {productVariantOptions} = this.state;
    let isError: any[] = [];
    for (const element of productVariantOptions) {
      if (element.selectedValue === '') {
        element.errorMassage = `Select ${element.name}`;
        isError.push(true);
      } else {
        element.errorMassage = '';
        isError.push(false);
      }
    }
    if (isScroll && isError.filter(value => value).length > 0) {
      this.scrollViewRef.current?.scrollTo({y: 200, x: 0, animated: true});
    }
    return (
      isError.filter(value => {
        return value;
      }).length > 0
    );
  };

  //CHECK QUANTITY AVAILABLE TO PROCEED OR NOT
  checkAvailableQty = () => {
    let total = 0;

    if (this.props.cartItem && this.props.cartItem.length) {
      this.props.cartItem.forEach(element => {
        total = element.node.quantity + total;
      });
    } else {
      total = 0;
    }

    this.setState({availableQty: total, isLoadError: false});
  };
  //CHECK ITEM QUANTITY AVAILABLE TO PROCEED OR NOT
  doCheckItemAvailableQty = () => {
    const {selectPriceIndex} = this.state;
    let isEmptyCart = isEmpty(this.state.selectedItem);

    if (!isEmptyCart && this.props.cartItem) {
      let selectedVariant = this.state.selectedItem;
      const productItem = this.state.product;
      const variants = productItem?.variants?.edges;

      // let cartItem = this.props.cartItem.find(cart => {
      //   return cart.node.merchandise.id === variants[selectPriceIndex]?.node.id;
      // });

      let cartItem = this.props.cartItem.reduce((total, item) => {
        if (item.node.merchandise.id === variants[selectPriceIndex]?.node.id) {
          total += item.node.quantity;
        }
        return total;
      }, 0);

      let quantityAvailable = selectedVariant?.quantityAvailable;

      let quantity = cartItem;
      //Including cart item
      let currant_available_Qty = quantityAvailable - quantity;

      if (
        quantityAvailable === quantity ||
        currant_available_Qty < this.state.product_quantity
      ) {
        return false;
      }
      return true;
    }
    return true;
  };

  doLoading(status: boolean) {
    this.setState({isLoading: status, isLoadError: false});
  }

  //WHEN FLATLIST INDEX CHANGED
  onViewableItemsChangedFlatList = ({viewableItems, changed}) => {
    if (viewableItems.length > 0) {
      let visible = viewableItems[0];
      let index = visible.index;

      this.setState({visibleIndex: index, isLoadError: false});
    }
  };

  //WHEN PRODUCT VARIANT SELECTED
  onSelect = (value, index, item) => {
    let {productVariantOptions, product} = this.state;

    productVariantOptions[index].errorMassage = '';

    this.handelValueChange(productVariantOptions[index].name, value);

    const productItem = product;

    const options = this.state.product?.options ?? [];

    let indexOfVal = productItem?.variants?.edges
      .map((_item1, _index1) => {
        let isSelectedIndex = _item1.node.selectedOptions?.every(
          (_item2, _index2) => {
            return (
              _item2.value == productVariantOptions[_index2]?.selectedValue
            );
          },
        );

        if (isSelectedIndex) return _index1;
      })
      .filter(item => item);

    let variantOptions = options
      .map((itemOption, indexOption) => {
        let combinations = productItem?.variants?.edges
          .map((_item1, _index1) => {
            if (
              _item1.node.selectedOptions[indexOption].value ==
                productVariantOptions[index]?.selectedValue &&
              _item1.node.selectedOptions.length > 1
            ) {
              return _item1;
            } else if (_item1.node.selectedOptions.length == 1) {
              return _item1;
            }
          })
          .filter(item => item);

        return combinations;
      })
      .flat(1);

    productVariantOptions[index].quantityAvailableData = variantOptions;

    this.getUniqueVariantCombination(productVariantOptions);

    this.setState({
      selectPriceIndex: Number(indexOfVal),
    });
  };

  //DO ADD TO WISHLIST API CALL AND HANDLE RESPONSE
  callAPIAddToWishList = async (dic: any, isRecommendation = false) => {
    let result = await checkNetwork();
    if (!result) {
      return;
    }

    let id = this.props.profile ? `${this.props.profile.id}` : '';
    let decodeee = getBaseDecodeId(id) ?? '';
    let arr = decodeee.split('/');
    let custID = arr.pop() ?? '';

    let productID = dic.id;
    let arrProduct = productID.split('/');
    let product_ID = arrProduct.pop();

    this.props
      .addToWishlist(custID, product_ID)
      .then(json => {
        const array = [...this.props.wishlist];
        array.push(json.wishlistItem);
        this.props.addLocalWishList(array);
        if (!isRecommendation) {
          this.setState({isSelected: true});
        }

        this.setState({
          isLoadError: false,
          isWishlistAPICalling: false,
          currentRemoveIndex: -1,
          isFavoriteLoader: false,
        });

        let items: any[] = [];
        const currencyCode =
          this.state.product?.priceRange.maxVariantPrice.currencyCode;
        items.push({
          item_id: this.state.product?.id,
          item_name: this.state.productTitle,
          item_brand: getAppName(),
          item_revenue: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
          item_price: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
          quantity: 1,
          price: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
        });

        doLogEvent('add_to_wishlist', {
          currency: currencyCode,
          value: parseFloat(this.productPrice.replace(/[^\d.]/g, '')) * 1,
          items: items,
        });
      })
      .catch(error => {
        this.setState({
          isWishlistAPICalling: false,
          currentRemoveIndex: -1,
          isFavoriteLoader: false,
        });
        this.doLoading(false);
        showSimpleDialogMessage(error.message, () => {});
      });
  };

  //DO REMOVE FROM WISHLIST API CALL AND HANDLE RESPONSE
  callAPIRemoveFromWishList = async (item: any, isRecommendation = false) => {
    let result = await checkNetwork();
    if (!result) {
      return;
    }

    let id = this.props.profile ? `${this.props.profile.id}` : '';
    let decodeee = getBaseDecodeId(id) ?? '';
    let arr = decodeee.split('/');
    let custID = arr.pop() ?? '';

    let productID = item.id;
    let arrProduct = productID.split('/');
    let product_ID = arrProduct.pop();

    this.props
      .removeFromWishlist(custID, product_ID)
      .then(json => {
        const array = [...this.props.wishlist];
        const filteArray = array.filter(item => item.product_id != product_ID);

        this.props.addLocalWishList(filteArray);
        if (!isRecommendation) {
          this.setState({isSelected: false});
        }

        this.setState({
          isLoadError: false,
          isWishlistAPICalling: false,
          currentRemoveIndex: -1,
          isFavoriteLoader: false,
        });
        let items: any[] = [];
        const currencyCode =
          this.state.product?.priceRange.maxVariantPrice.currencyCode;
        items.push({
          item_id: this.state.product?.id,
          item_name: this.state.productTitle,
          item_brand: getAppName(),
          item_revenue: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
          item_price: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
          quantity: 1,
          price: parseFloat(this.productPrice.replace(/[^\d.]/g, '')),
        });

        doLogEvent('remove_from_wishlist', {
          currency: currencyCode,
          value: parseFloat(this.productPrice.replace(/[^\d.]/g, '')) * 1,
          items: items,
        });
      })
      .catch(error => {
        this.setState({
          isWishlistAPICalling: false,
          currentRemoveIndex: -1,
          isFavoriteLoader: false,
        });
        this.doLoading(false);
        showSimpleDialogMessage(error.message, () => {});
      });
  };

  onPressFavorite = async (isSelected: boolean) => {
    let decodeId;
    let titleName;
    let productImage;
    let currencyCode;
    let amount;
    let price;

    let result = await checkNetwork();
    if (!result) {
      return;
    }

    if (this.state.isWishlistAPICalling) {
      return;
    }

    let productItem;
    this.setState({isLoadError: false});

    if (
      this.isScreenValidation() ||
      this.state.fromScreen === 'CategoryScreen'
    ) {
      const {product} = this.state;
      decodeId = getBaseDecodeId(product?.id ?? '');
      titleName = product?.title;
      productImage = product?.images.edges.length
        ? product.images.edges[0].node.originalSrc
        : '';
      currencyCode =
        product?.priceRange.minVariantPrice.currencyCode ?? DEFAULT_CURRENCY;
      amount = product?.priceRange.minVariantPrice.amount;
      price = `${getCurrencyCode(currencyCode)}${amount}`;
      productItem = product;
    } else {
      const {id, title, images, priceRange} =
        this.props.route.params.params.item;

      currencyCode = priceRange.minVariantPrice.currencyCode;
      titleName = title;
      amount = priceRange.minVariantPrice.amount;
      price = `${currencyCode}${amount}`;
      const imageEdges = images.edges;
      productItem = this.props.route.params.params.item;

      if (imageEdges) {
        const node = imageEdges[0];
        if (node) {
          productImage = node.node.originalSrc;
        }
      }
      decodeId = getBaseDecodeId(id);
    }
    let dic = {
      id: decodeId,
      title: titleName,
      image: productImage,
      price: price,

      product: productItem,
    };
    this.setState({isWishlistAPICalling: true, isFavoriteLoader: true});
    if (isSelected) {
      this.callAPIRemoveFromWishList(dic);
    } else {
      this.callAPIAddToWishList(dic);
    }
  };

  onPressProductFav = async (dic: any, isLiked: boolean, index: number) => {
    if (this.state.isWishlistAPICalling) {
      return;
    }
    let result = await checkNetwork();
    if (!result) {
      return;
    }
    this.setState({isWishlistAPICalling: true, currentRemoveIndex: index});
    if (isLiked) {
      this.callAPIRemoveFromWishList(dic, true);
    } else {
      this.callAPIAddToWishList(dic, true);
    }
    // }
  };

  _renderProductImage = (item: any, index: number) => {
    const {selectPriceIndex} = this.state;
    const {theme} = this.props;

    const productItem = this.state.product;

    const variants = productItem?.variants?.edges;

    const compareAtPrice =
      variants && variants.length > 0
        ? variants[selectPriceIndex]?.node?.compareAtPrice?.amount
        : undefined;

    const priceRange = productItem?.priceRange;
    let currencyCode =
      priceRange?.minVariantPrice?.currencyCode ?? DEFAULT_CURRENCY;
    let discountedPrice: string | undefined = compareAtPrice
      ? `${currencyCode}${getSymbolFromCurrency(currencyCode)}${compareAtPrice}`
      : undefined;

    return (
      <TouchableOpacity
        activeOpacity={1}
        style={
          isProductImagesSqure()
            ? {height: Dimensions.get('screen').width}
            : null
        }
        onPress={() => {
          this.setState({
            selectedIndex: index,
            isFullScreen: true,
            isLoadError: false,
          });
        }}>
        <ImageSlider
          key={productItem?.title}
          imgStyle={[
            styles.imgsTop,
            {
              width: Dimensions.get('screen').width,
              height: Dimensions.get('screen').width * getProductImagesRatio(),
            },
          ]}
          uri={item?.image}
        />
        {discountedPrice != undefined && (
          <View
            style={[
              styles.discountTagView,
              {
                backgroundColor: isColorCode(theme, 'primary_color', 'BLACK'),
                borderWidth: isLightColor(
                  isColorCode(theme, 'primary_color', 'BLACK'),
                )
                  ? 1
                  : 0,
                borderColor: isLightColor(
                  isColorCode(theme, 'primary_color', 'BLACK'),
                )
                  ? isColorCode(theme, 'secondary_color', 'WHITE')
                  : isColorCode(theme, 'primary_color', 'BLACK'),
              },
            ]}>
            <Text
              style={[
                styles.textStyle,
                {color: isColorCode(theme, 'secondary_color', 'WHITE')},
              ]}>
              {translate('products.sale')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  _renderTitleView = () => {
    const {selectPriceIndex, is_inventory} = this.state;
    const productItem = this.state.product;
    const variants = productItem?.variants?.edges;

    const amount =
      variants && variants.length > 0
        ? Number(variants[selectPriceIndex]?.node?.price?.amount)
        : 0;

    const priceRange = productItem?.priceRange;
    let currencyCode =
      priceRange?.minVariantPrice?.currencyCode ?? DEFAULT_CURRENCY;

    let price = `${getSymbolFromCurrency(currencyCode)}${amount?.toFixed(2)}`;
    this.productPrice = price;
    const compareAtPrice =
      variants && variants.length > 0
        ? Number(variants[selectPriceIndex]?.node?.compareAtPrice?.amount)
        : undefined;

    let discountedPrice = compareAtPrice
      ? `${getSymbolFromCurrency(currencyCode)}${compareAtPrice.toFixed(
          2,
        )}${currencyCode}`
      : undefined;

    //Percentage Logic
    let originalPrice = Number(compareAtPrice);
    let discountlPrice = Number(amount);

    let discountAmount = originalPrice - discountlPrice;
    let descountPercentage = (discountAmount / originalPrice) * 100;
    let productTile = '';
    if (this.isScreenValidation()) {
      productTile = this.props.route.params.params.title ?? '';
    } else {
      productTile = this.props.route.params.params.item?.title ?? '';
    }

    return (
      <View style={[styles.row]}>
        <TitleDetailsView
          title={
            isProductNameCapital() ? productTile.toUpperCase() : productTile
          }
          price={`${price}${currencyCode}`}
          desc={discountedPrice}
          desPercentage={`${Math.round(descountPercentage)}`}
        />
      </View>
    );
  };
  actionQuantity = (type: string) => {
    const {is_inventory, product_quantity} = this.state;
    let quantity = product_quantity;
    if (type === QtyUpdate.plus) {
      quantity = quantity + 1;
    } else {
      if (quantity > 1) quantity = quantity - 1;
    }
    this.setState({product_quantity: quantity});
  };

  updateQuantity = (value: string) => {
    if (value.length <= 0 || parseInt(value) <= 0) {
      this.setState({product_quantity: 1});
      return;
    }
    if (parseInt(value) < 0) {
      return;
    }
    this.setState({product_quantity: parseInt(value)});
  };
  _renderQuantityView = () => {
    const {selectPriceIndex, is_inventory, product_quantity} = this.state;

    let quantityAvailable2 = 10;
    return (
      <View style={styles.viewBtnQty}>
        <Pressable
          activeOpacity={1}
          disabled={is_inventory ? product_quantity <= 1 : false}
          onPress={() => this.actionQuantity(QtyUpdate.minus)}>
          <Image
            source={Assets.ic_minus}
            style={[
              styles.qtyIcon,
              {tintColor: product_quantity <= 1 ? colors.BOMBAY : colors.BLACK},
            ]}
          />
        </Pressable>
        <View style={styles.viewQtyTxt}>
          {/* {is_inventory ? (
            <Text style={styles.qtyTxt}>{product_quantity}</Text>
          ) : ( */}
          <TextInput
            ref={c => (this._input = c)}
            style={[styles.qtyTxt, {padding: 1, color: colors.BLACK}]}
            numberOfLines={1}
            keyboardType="numeric"
            contextMenuHidden={true}
            onChangeText={text => {
              this.updateQuantity(text);
            }}
            value={product_quantity.toString()}
          />
          {/* )} */}
        </View>

        <Pressable
          activeOpacity={1}
          // disabled={
          //   is_inventory ? product_quantity >= quantityAvailable2 : false
          // }
          onPress={() => {
            this.actionQuantity(QtyUpdate.plus);
          }}>
          <Image
            source={Assets.ic_plus}
            style={[
              styles.qtyIcon,
              {
                tintColor: colors.BLACK,
              },
            ]}
          />
        </Pressable>
      </View>
    );
  };

  //CALLED WHEN PRODUCT ITEM TAPPED
  onPressProductItem(item: any) {
    return this.props.navigation.push('ProductDetails', {
      params: {
        item: item,
        DetailParent: DetailParent.Product,
        themeColor: this.props.theme,
        setIcons: this.props.setIcons,
        storeData: this.props.storeData,
      },
    });
  }

  //FOR CHECK IMAGE IS AVAILABLE OR NOT
  checkForImage(url: string) {
    let regex = /^https?:\/\/.*\/.*\.(png|gif|webp|jpeg|jpg)\??.*$/gim;
    let result;
    if (url.match(regex)) {
      result = {
        match: url.match(regex),
      };
    } else {
      result = false;
    }
    return result;
  }

  productSliderLayoutView(_item: any) {
    const {related_product_count} = this.props.storeData;

    if (_item.length <= 0 || related_product_count == 0) {
      return;
    }
    return (
      <View style={styles.recommendationView}>
        <Text
          adjustsFontSizeToFit={true}
          numberOfLines={1}
          style={styles.headerText}>
          {translate('productDetails.youMayAlsoLike')}
        </Text>
        <FlatList
          data={_item}
          bounces={false}
          horizontal={true}
          keyExtractor={(item, index) => index.toString()}
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          renderItem={({item, index}) =>
            this.productSliderSubLayoutView(item, index)
          }
        />
      </View>
    );
  }

  productSliderSubLayoutView = (item: any, index: number) => {
    let heightWidth = isIpad()
      ? (Dimensions.get('window').width - 20) / 3.3
      : (Dimensions.get('window').width - 20) / 2.3;
    let imageHeight = heightWidth * getProductImagesRatio();
    let productItem = item?.id;

    let arrProduct = productItem?.split('/');
    let product_ID = arrProduct?.pop();

    let title = item?.title;
    const variants = item?.variants?.edges;
    const amount =
      variants && variants.length > 0
        ? Number(variants[0]?.node?.price.amount)
        : 0;

    const compareAtPrice =
      variants && variants.length > 0
        ? variants[0]?.node?.compareAtPrice
        : undefined;

    let currencyCode = variants[0].node?.price?.currencyCode;

    let price = `${getSymbolFromCurrency(currencyCode)}${amount?.toFixed(2)}`;
    let discountedPrice = compareAtPrice
      ? `${getSymbolFromCurrency(currencyCode)}${Number(
          compareAtPrice.amount,
        ).toFixed(2)}${currencyCode}`
      : undefined;

    let isGest = this.props.profile == undefined;

    let check_uri = !this.checkForImage(item.images?.edges[0]?.node.url)
      ? 'https://mshop.com/images/default.jpg'
      : item.images?.edges[0]?.node.url;

    return (
      <TouchableOpacity
        style={{
          alignItems: 'flex-start',
          marginEnd: 10 === index ? 0 : 10,
        }}
        onPress={() => this.onPressProductItem(item)}>
        <CollectionListItem
          isGest={isGest}
          backgroundColor={this.state.buttonColor}
          price={`${price}${currencyCode}`}
          productItem={productItem}
          imageUrl={check_uri}
          discountedPrice={discountedPrice}
          index={index}
          isLiked={this.props.wishlist.some(
            item => item?.product_id == product_ID,
          )}
          onPressProductFav={(dic, isLiked, index) =>
            !this.state.isWishlistAPICalling &&
            this.onPressProductFav(dic, isLiked, index)
          }
          title={title}
          productId={item?.id}
          imageStyle={[
            styles.recommendationImageStyle,
            {
              height: imageHeight,
              width: isProductImagesSqure() ? imageHeight : heightWidth,
            },
          ]}
          styleCount={variants && variants?.length}
          containerMaxWidth={heightWidth}
          // txtPriceStyle={styles.originalPriceStyle}
          // txtTitleStyle={styles.originalPriceStyle}
          //  txtDiscountedPriceStyle={styles.discountText}
          isWishlistAPICalling={this.state.isWishlistAPICalling}
          currentRemoveIndex={this.state.currentRemoveIndex}
        />
      </TouchableOpacity>
    );
  };

  render() {
    const {
      isAddTocart,
      productVariantOptions,
      isAvailableForSale,
      isUnavailable,
      productImages,
      isFullScreen,
      parent,
      product,
      isSelected,
      isLoadError,
      is_inventory,
    } = this.state;

    const {theme, setIcons} = this.props;
    let newHeight = isProductImagesSqure()
      ? Dimensions.get('window').width
      : Dimensions.get('screen').width * 1.25;

    let cartTitle = is_inventory
      ? isUnavailable
        ? translate('productDetails.unavailable')
        : !isAvailableForSale
        ? translate('productDetails.soldOut')
        : isAddTocart
        ? translate('productDetails.viewCart')
        : translate('productDetails.addTocart')
      : isAddTocart
      ? translate('productDetails.viewCart')
      : translate('productDetails.addTocart');

    let buyNow = is_inventory
      ? isUnavailable
        ? translate('productDetails.unavailable')
        : !isAvailableForSale
        ? translate('productDetails.soldOut')
        : translate('productDetails.buyNow')
      : translate('productDetails.buyNow');

    let themeBgColor = isLightColor(
      isColorCode(theme, 'primary_color', 'BLACK'),
    )
      ? isLightColor(isColorCode(theme, 'secondary_color', 'BLACK'))
        ? isColorCode(theme, 'primary_color', 'BLACK')
        : isColorCode(theme, 'secondary_color', 'BLACK')
      : isColorCode(theme, 'primary_color', 'BLACK');
    let btnBgColor = is_inventory
      ? isUnavailable
        ? colors.GREY
        : !isAvailableForSale
        ? colors.GREY
        : isAddTocart
        ? themeBgColor
        : themeBgColor
      : themeBgColor;
    if (this.state.isLoading) {
      return <Loader isLoading={this.state.isLoading} />;
    }
    const productDescriptionHtml = product?.descriptionHtml ?? '';
    const truncatedDescription = productDescriptionHtml.slice(
      0,
      CHARACTER_LENGTH,
    );
    const productDescription = product?.description ?? '';

    return (
      <View style={styles.container}>
        <StatusBar
          translucent
          barStyle={
            isLightColor(isColorCode(theme, 'primary_color', 'BLACK'))
              ? 'dark-content'
              : 'light-content'
          }
          backgroundColor={isColorCode(theme, 'primary_color', 'BLACK')}
        />
        <KeyboardProvider>
          <KeyboardAwareScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            {productImages.length > 0 ? (
              <View
                style={[
                  styles.viewFlatList,
                  {
                    width: Dimensions.get('screen').width,
                    height: newHeight,
                  },
                ]}>
                <FlatList
                  onViewableItemsChanged={this.onViewableItemsChangedFlatList}
                  disableIntervalMomentum={true}
                  pagingEnabled={true}
                  removeClippedSubviews={false}
                  ref={this.flatListRef}
                  viewabilityConfig={{viewAreaCoveragePercentThreshold: 50}}
                  onScrollToIndexFailed={error => {
                    this.flatListRef.current?.scrollToOffset({
                      offset: error.averageItemLength * error.index,
                      animated: false,
                    });
                    setTimeout(() => {
                      if (productImages.length !== 0) {
                        this.flatListRef.current?.scrollToIndex({
                          index: error.index,
                          animated: false,
                        });
                      }
                    }, 100);
                  }}
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  style={[styles.imgFlatList, {height: newHeight}]}
                  refreshing={false}
                  data={productImages}
                  extraData={this.state}
                  initialScrollIndex={this.state.initialImageScrollIndex}
                  keyExtractor={index => index.image}
                  renderItem={({item, index}) =>
                    this._renderProductImage(item, index)
                  }
                />
              </View>
            ) : (
              <Image style={styles.imgsTop} source={Assets.placeholder} />
            )}
            {this._renderTitleView()}

            {this._renderQuantityView()}
            <View
              style={{backgroundColor: colors.ATHENS_GRAY, paddingBottom: 7}}
            />
            <View>
              <Indicator
                pages={productImages}
                customImage={{borderRadius: 5}}
                onPress={(index: number) =>
                  this.setState({visibleIndex: index}, () =>
                    this.flatListRef.current?.scrollToIndex({
                      index: index,
                      animated: false,
                    }),
                  )
                }
                indicatorPosition="row"
                currentIndex={this.state.visibleIndex}
              />
            </View>

            {productVariantOptions
              .filter(opt => {
                let isTrue = opt.values.some((items: any) => {
                  return items.toLowerCase() == 'Default Title'.toLowerCase();
                });
                if (!isTrue) return opt;
              })
              .map((item, index) => {
                return (
                  <View
                    key={index}
                    style={[
                      {backgroundColor: colors.ATHENS_GRAY, paddingBottom: 7},
                    ]}>
                    <ProductOption
                      // colorCombination={this.state.colorCombination}
                      // styleCombination={this.state.styleCombination}
                      multipleVariantCombination={
                        this.state.multipleVariantCombination
                      }
                      // currencyCombination={this.state.currencyCombination}
                      // mlvedaCountryCombination={
                      //   this.state.mlvedaCountryCombination
                      // }
                      colorUrl={this.props.storeData}
                      title={item.name}
                      values={item.values}
                      selectedValue={productVariantOptions[index].selectedValue}
                      isError={productVariantOptions[index].errorMassage}
                      isLoadError={isLoadError}
                      onSelect={value => this.onSelect(value, index, item)}
                      variantNameList={this.state.product?.options.map(
                        item => item.name,
                      )}
                    />
                  </View>
                );
              })}

            {productDescription ? (
              <ProductOption
                title={translate('productDetails.productDescription')}
              />
            ) : null}

            {parent === DetailParent.Cart ? (
              <View style={styles.bottomDesc}>
                <WebDisplay
                  baseStyle={{
                    fontSize: isIpad() ? FontsSize.font10 : FontsSize.font14,
                  }}
                  contentWidth={Dimensions.get('window').width}
                  source={{
                    html: this.state.isReadMore
                      ? productDescriptionHtml
                      : truncatedDescription,
                  }}
                />
                {productDescription?.length > CHARACTER_LENGTH && (
                  <TouchableOpacity
                    onPress={() => {
                      this.setState({isReadMore: !this.state.isReadMore});
                    }}>
                    <Text style={styles.longTextStyle}>
                      {this.state.isReadMore
                        ? translate('productDetails.readLess')
                        : translate('productDetails.readMore')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.bottomDesc}>
                <WebDisplay
                  baseStyle={{
                    fontSize: isIpad() ? FontsSize.font10 : FontsSize.font14,
                  }}
                  contentWidth={Dimensions.get('window').width}
                  source={{
                    html: this.state.isReadMore
                      ? productDescriptionHtml
                      : truncatedDescription,
                  }}
                />
                {productDescription?.length > CHARACTER_LENGTH && (
                  <TouchableOpacity
                    onPress={() => {
                      this.setState({isReadMore: !this.state.isReadMore});
                      LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut,
                      );
                    }}>
                    <Text style={styles.longTextStyle}>
                      {this.state.isReadMore
                        ? translate('productDetails.readLess')
                        : translate('productDetails.readMore')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <ProductDetailComponents
              isMultipleImage={this.state.isMultipleImage}
              maximumImages={this.state.maximumImages}
              doUploadImage={this.props.doUploadImage}
              doStagedUploadsCreate={this.props.doStagedUploadsCreate}
              onGetImages={(images: IImageUpload[]) => {
                console.log('images', images);
              }}
              onContactNo={text => {
                this.setState({contactNo: text});
              }}
              onContent={text => {
                this.setState({customContent: text});
              }}
              onName={text => {
                this.setState({customName: text});
              }}
              onShortMessage={text => {
                this.setState({shortMessage: text});
              }}
              onTitle={text => {
                this.setState({customTitle: text});
              }}
              componentType={getComponentTag(this.state.product?.tags ?? [])}
              onLoadStarted={() => {
                this.setState({isImageUploading: true});
              }}
              onLoadEnded={() => {
                this.setState({isImageUploading: false});
              }}
              onWidthValue={item => {
                this.setState({wInch: {id: item.id, value: item.value}});
              }}
              onHeighValue={item => {
                this.setState({hInch: {id: item.id, value: item.value}});
              }}
              onWidthFootValue={item => {
                this.setState({wFoot: {id: item.id, value: item.value}});
              }}
              onHeighFootValue={item => {
                this.setState({hFoot: {id: item.id, value: item.value}});
              }}
              onTextArea={(label, text) => {
                this.setState({textArea: {label: label, value: text}});
              }}
              onImageSelected={image => {
                this.setState({selectedImage: image});
              }}
              onPriceCalculated={price => {
                this.productPrice = price;
              }}
              currencyCode={
                this.state.product?.priceRange?.minVariantPrice?.currencyCode ??
                DEFAULT_CURRENCY
              }
              hInchSelected={this.state.hInch.value}
              wInchSelected={this.state.wInch.value}
              hFootSelected={this.state.hFoot.value}
              wFootSelected={this.state.wFoot.value}
              shortMessage={this.state.shortMessage}
              customName={this.state.customName}
              textArea={this.state.textArea.value}
              customTitle={this.state.customTitle}
              contactNo={this.state.contactNo}
              customContent={this.state.customContent}
              productBasePrice={
                this.state.product?.priceRange?.minVariantPrice?.amount ?? '0'
              }
              onRemoveImage={(index, removedImage) => {
                this.setState({isAddTocart: false}, () => {
                  const updatedImages = this.props.uploadedImages;
                  updatedImages.splice(index, 1);
                  this.props.setUploadedImages(updatedImages);
                });
              }}
            />

            <View
              style={{backgroundColor: colors.ATHENS_GRAY, paddingBottom: 7}}
            />

            <>{this.productSliderLayoutView(this.state.recommendationList)}</>
          </KeyboardAwareScrollView>

          <View style={styles.bottomViewContainer}>
            {this.props.storeData?.is_show_buy_now ? (
              <>
                {this.state.product ? (
                  <Button
                    customStyle={{
                      ...styles.addToCartContainer,
                    }}
                    onPress={() => this.onPressAddToCart()}
                    label={cartTitle}
                    borderWidth={1}
                    borderColor={btnBgColor}
                    isLoading={this.state.isAddToCartLoading}
                    labelStyle={{color: btnBgColor}}
                    loaderColor={
                      isLightColor(isColorCode(theme, 'primary_color', 'BLACK'))
                        ? isLightColor(
                            isColorCode(theme, 'secondary_color', 'BLACK'),
                          )
                          ? isColorCode(theme, 'primary_color', 'BLACK')
                          : isColorCode(theme, 'secondary_color', 'BLACK')
                        : isColorCode(theme, 'primary_color', 'BLACK')
                    }
                  />
                ) : null}

                {this.state.product ? (
                  <Button
                    customStyle={{
                      ...styles.addToCartContainer,
                      backgroundColor: themeBgColor,
                      marginLeft: 10,
                    }}
                    borderWidth={1}
                    borderColor={
                      isLightColor(isColorCode(theme, 'primary_color', 'BLACK'))
                        ? isLightColor(
                            isColorCode(theme, 'secondary_color', 'BLACK'),
                          )
                          ? isColorCode(theme, 'primary_color', 'BLACK')
                          : isColorCode(theme, 'secondary_color', 'BLACK')
                        : isColorCode(theme, 'primary_color', 'BLACK')
                    }
                    onPress={() => this.onPressAddToCart(true)}
                    label={translate('productDetails.buyNow')}
                    labelStyle={{
                      color: isLightColor(
                        isColorCode(theme, 'secondary_color', 'WHITE'),
                      )
                        ? isColorCode(theme, 'secondary_color', 'WHITE')
                        : isColorCode(theme, 'primary_color', 'WHITE'),
                    }}
                    isLoading={this.state.isBuyNowLoading}
                  />
                ) : null}
              </>
            ) : (
              <>
                {this.state.product ? (
                  <Button
                    customStyle={{
                      ...styles.addToCartContainer,
                      backgroundColor: btnBgColor,
                      ...(!this.props.storeData?.is_show_buy_now
                        ? {flex: 1}
                        : {}),
                    }}
                    onPress={() => this.onPressAddToCart()}
                    label={cartTitle}
                    labelStyle={{
                      color: isLightColor(
                        isColorCode(theme, 'secondary_color', 'WHITE'),
                      )
                        ? isColorCode(theme, 'secondary_color', 'WHITE')
                        : isColorCode(theme, 'primary_color', 'WHITE'),
                    }}
                    isLoading={this.state.isAddToCartLoading}
                  />
                ) : null}
              </>
            )}
            {this.props.profile &&
              isShowWishListPlanWise(
                this.props.storeData?.activated_plan_id,
                this.props.storeData?.wishlist_override,
              ) && (
                <View style={styles.favouriteContainer}>
                  <TouchableOpacity
                    style={[
                      styles.favouriteIconBackground,
                      {
                        borderColor: isLightColor(
                          isColorCode(theme, 'primary_color', 'BLACK'),
                        )
                          ? isLightColor(
                              isColorCode(theme, 'secondary_color', 'BLACK'),
                            )
                            ? isColorCode(theme, 'primary_color', 'BLACK')
                            : isColorCode(theme, 'secondary_color', 'BLACK')
                          : isColorCode(theme, 'primary_color', 'BLACK'),
                      },
                    ]}
                    onPress={() => this.onPressFavorite(isSelected)}>
                    {this.state.isFavoriteLoader ? (
                      <ActivityIndicator size={'small'} color={colors.RED} />
                    ) : isSelected ? (
                      setIcons ? (
                        <Image
                          source={{uri: setIcons.like_fill_icon}}
                          style={[styles.likeUnlike]}
                        />
                      ) : (
                        <Like
                          fill="black"
                          width={isIpad() ? 25 : 25}
                          height={isIpad() ? 25 : 25}
                        />
                      )
                    ) : setIcons ? (
                      <Image
                        source={{uri: setIcons.like_outline_icon}}
                        style={[styles.likeUnlike]}
                      />
                    ) : (
                      <NotLike
                        width={isIpad() ? 25 : 25}
                        height={isIpad() ? 25 : 25}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              )}
          </View>

          <Loader
            isLoading={this.state.isLoading || this.state.isImageUploading}
          />

          {isFullScreen ? (
            <FullScreenImage
              productImages={productImages}
              isFullScreen={isFullScreen}
              onClose={(isFullScreen: boolean) =>
                this.setState({isFullScreen, isLoadError: false})
              }
              selectedIndex={this.state.selectedIndex}
            />
          ) : null}
          <SafeAreaView />
        </KeyboardProvider>
      </View>
    );
  }
}

const mapStateToProps = (state: IRootState) => ({
  accessToken: state.user.accessToken,
  cartId: state.cart.cartId,
  cartItem: state.cart.cartItem,
  wishlist: state.wish.wishlist,
  profile: state.user.profile,
  storeData: state.storeData.storeData,
  theme: state.theme.theme,
  setIcons: state.theme.setIcons,
  navigationRef: state.theme.navigationRef,
  uploadedImages: state.product.uploadedImages,
});

const mapDispatchToProps = (dispatch: any) => ({
  product: (id: string) => dispatch(product(id)),
  getCart: (cartID: string) => dispatch(getCart(cartID)),
  addToCart: (
    customerAccessToken: string,
    attributes: ICartAttributes[],
    quantity: string,
    variantID: string,
    profile?: IProfile,
    isBuyNow?: boolean,
  ) =>
    dispatch(
      addToCart(
        customerAccessToken,
        attributes,
        quantity,
        variantID,
        profile,
        isBuyNow,
      ),
    ),

  updateCart: (
    cartID: string,
    attributes: ICartAttributes[],
    quantity: string,
    variantID: string,
  ) => dispatch(updateCart(cartID, attributes, quantity, variantID)),
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
  addToWishlist: (customerId: string, productId: string) =>
    dispatch(addToWishlist(customerId, productId)),
  removeFromWishlist: (customerId: string, productId: string) =>
    dispatch(removeFromWishlist(customerId, productId)),
  addLocalWishList: (params: IWishListItem[]) =>
    dispatch(addLocalWishList(params)),
  updateFromWishlist: (id: string, value: any) =>
    dispatch(updateFromWishlist(id, value)),
  recommendationProducts: (id: string) => dispatch(recommendationProducts(id)),
  doUploadImage: (imagePath: string) => dispatch(doUploadImage(imagePath)),
  doStagedUploadsCreate: (
    imagePath: string,
    callback: () => void,
    onError: (error: {message: string}) => void,
  ) => dispatch(doStagedUploadsCreate(imagePath, callback, onError)),
  doCreateProductVariant: (
    price: string,
    productId: string,
    optionsTitle: string,
  ) => dispatch(doCreateProductVariant(price, productId, optionsTitle)),
  setUploadedImages: (imagePaths: IUploadImageItem[]) =>
    dispatch(setUploadedImages(imagePaths)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProductDetailsScreen);
