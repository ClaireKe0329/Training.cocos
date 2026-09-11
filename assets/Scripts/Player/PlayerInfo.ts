import { _decorator, Component } from 'cc';
import { GameConfig } from '../GameUtility/GameConfig';

const { ccclass } = _decorator;

// 保存玩家目前的 Balance、Bet 與 Win；只管理玩家資料，不決定 Game Flow
@ccclass( 'PlayerInfo' )
export class PlayerInfo extends Component
{
    // 玩家目前可使用的 Balance
    private _balance: number = 0;

    // 玩家目前設定的 Bet
    private _bet: number = 0;

    // 玩家目前的 Win
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

    // 判斷目前 Balance 是否足以支付 Bet
    public get CanAffordBet(): boolean
    {
        return this._balance >= this._bet;
    }

    // 使用 GameConfig 的初始設定建立玩家資料
    protected start(): void
    {
        const gameConfig: GameConfig = GameConfig.GetInstance();

        this._balance = gameConfig.InitialBalance;
        this._bet = gameConfig.InitialBet;
        this._win = 0;
    }

    // 扣除 Bet 金額
    public DeductBet( bet: number ): void
    {
        this._balance -= bet;
    }

    // 更新目前設定的 Bet
    public SetBet( bet: number ): void
    {
        this._bet = bet;
    }

    // 清除目前 Win
    public ResetWin(): void
    {
        this._win = 0;
    }

    // 更新目前 Win
    public SetWin( win: number ): void
    {
        this._win = win;
    }

    // 將 Win 金額加入 Balance
    public AddWinToBalance( win: number ): void
    {
        this._balance += win;
    }
}