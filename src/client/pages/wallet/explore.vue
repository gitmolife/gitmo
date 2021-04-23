<template>
		<div style="text-align: center; margin-top: 7px; margin-bottom: 30px;">

			<MkContainer :body-togglable="true" class="_gap">
				<template #header><Fa :icon="faTachometerAlt"/> Wallet Explorer - OHM</template>
				<div class="_content">
					<div class="_keyValue"><b>TxID</b><span class="monospace" style="font-size: 1.07em;">{{ tx.txid }}</span></div>
				</div>
				<div class="_content">
					<div class="_keyValue"><b>Blockhash</b><span class="monospace" style="font-size: 1.07em;">{{ tx.blockhash }}</span></div>
				</div>
			</MkContainer>

		</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import parseAcct from '@/misc/acct/parse';
import Progress from '@client/scripts/loading';
import { faOm } from '@fortawesome/free-solid-svg-icons';
import { faBtc } from '@fortawesome/free-brands-svg-icons';
import { query as urlQuery } from '../../../prelude/url';
import { acct as getAcct } from '../../filters/user';
import * as os from '@client/os';
import QRCode from 'qrcode';

export default defineComponent({
	components: {

	},

	props: {
		txid: {
			type: String,
			required: false
		},
	},

	data() {
		return {
			tx: {
				txid: "",
				blockhash: "",
			},
			url: "",
			resp_message: "",
			faBtc, faOm,
		};
	},

	created() {
		this.fetch();
	},

	methods: {
		getAcct,

		fetch() {
			this.url = "http://explorer.ohm.sqdmc.net/tx/" + this.txid;
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
	text-shadow: -1px 2px 7px rgba(21, 29, 33, 0.88);
	font-style: underline;
	opacity: 0.88;
}

</style>
