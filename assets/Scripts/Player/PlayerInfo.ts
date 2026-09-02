import { _decorator, Component } from 'cc';
import { GameConfig } from '../GameUtility/GameConfig';

const { ccclass } = _decorator;

// 保存玩家目前的 Balance、Bet 與 Win，不持有 UI 或決定 Round Flow
@ccclass( 'PlayerInfo' )
export class PlayerInfo extends Component
{
    // 玩家目前可使用的 Balance
    private _balance: number = 0;

    // 目前每局使用的 Bet
    private _bet: number = 0;

    // 目前一局顯示的 Win
    private _win: number = 0;

    public get Balance(): number
    {
        return this._balance;
    }

    public get Bet(): number
    {
        return this._bet;
    }

    public get Win(): number
    {
        return this._win;
    }

    // 只判斷玩家資料是否足以支付 Bet；是否能開始 Round 由 SlotGameManager 決定
    public get CanAffordBet(): boolean
    {
        return this._balance >= this._bet;
    }

    // GameConfig 載入完成後初始化玩家資料
    protected start(): void
    {
        const gameConfig: GameConfig = GameConfig.GetInstance();

        this._balance = gameConfig.InitialBalance;
        this._bet = gameConfig.InitialBet;
        this._win = 0;
    }

    // 扣除目前一局使用的 Bet；呼叫時機由 SlotGameManager 負責
    public DeductBet(): void
    {
        this._balance -= this._bet;
    }

    // 清除上一局顯示的 Win
    public ResetWin(): void
    {
        this._win = 0;
    }

    // 設定目前一局顯示的 Win
    public SetWin( win: number ): void
    {
        this._win = win;
    }

    // 將目前 Win 結算至 Balance；結算時機由 SlotGameManager 負責
    public AddWinToBalance(): void
    {
        this._balance += this._win;
    }
}
