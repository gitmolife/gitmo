<template>
		<div style="text-align: center; margin-top: 7px; margin-bottom: 30px;">
			<div style="font-size: 1.22em;">OHM Wallet Address</div>
			<div id="address_text" @click="copyAddress('address_text');" class="monospace"><span class="address-texts">{{ address }}</span></div>
			<div><img v-bind:src="qrcode" style="image-rendering: pixelated; height: 370px; width: 370px; padding: 5px;"/></div>
			<div class="resp-message">{{ resp_message }}</div>
		</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import parseAcct from '@/misc/acct/parse';
import Progress from '@client/scripts/loading';
import { query as urlQuery } from '../../../prelude/url';
import { acct as getAcct } from '../../filters/user';
import * as symbols from '@client/symbols';
import * as os from '@client/os';
import QRCode from 'qrcode';

export default defineComponent({
	components: {

	},

	props: {
		acct: {
			type: String,
			required: false
		},
	},

	data() {
		return {
			[symbols.PAGE_INFO]: {
				title: 'CryptoWallet Address',
			},
			address: "",
			qrcode: "0x",
			resp_message: "",
			bbusy: false,
		};
	},

	created() {
		this.fetch();
	},

	methods: {
		getAcct,

		fetch() {
			if (this.acct == null) {
				Progress.start();
				os.api('wallet/address').then(wallet => {
					this.address = wallet;
					this.createQR(wallet);
				}).catch(e => {
					this.error = e;
				}).finally(() => {
					Progress.done();
				});
			} else {
				Progress.start();
				os.api('wallet/address', parseAcct(this.acct)).then(wallet => {
					this.address = wallet;
					this.createQR(wallet);
				}).catch(e => {
					this.error = e;
				}).finally(() => {
					Progress.done();
				});
			}
		},

		createQR(address: any) {
			QRCode.toDataURL(address)
				.then(url => {
					this.qrcode = url;
				})
				.catch(err => {
					console.error(err);
				});
		},

		copyAddress(elm: string) {
			let vm = this;
			try {
				var range = document.createRange();
				range.selectNode(document.getElementById(elm));
				window.getSelection().removeAllRanges();
				window.getSelection().addRange(range);
				var successful = document.execCommand('copy');
				var msg = successful ? 'successful' : 'unsuccessful';
				if (this.bbusy) {
					return;
				}
				this.bbusy = true;
				if(msg == "successful"){
					this.resp_message = "Address copied to Clipboard..";
					setTimeout(function() {
						vm.resp_message = "";
						vm.bbusy = false;
					}, 6600);
				} else {
					this.resp_message = "An Error occurred on Address copy to Clipboard.";
					setTimeout(function() {
						vm.resp_message = "";
						vm.bbusy = false;
					}, 16600);
				}
				window.getSelection().removeAllRanges();
			} catch (err) {
				this.resp_message = "Unable to copy Address to Clipboard.";
				setTimeout(function() {
					vm.resp_message = "";
					vm.bbusy = false;
				}, 17600);
			}
		},

	}

});
</script>

<style lang="scss" scoped>

.monospace {
	font-family: Lucida Console, Courier, monospace;
}
.resp-message {
	font-family: Lucida Console, Courier, monospace;
	font-style: italic;
	font-size: 15px;
}
.address-texts {
	text-shadow: -1px 2px 3px rgba(21, 29, 33, 0.77);
	font-style: underline;
	opacity: 0.88;
}

</style>
