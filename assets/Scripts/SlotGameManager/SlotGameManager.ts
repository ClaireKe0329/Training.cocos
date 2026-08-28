import { _decorator, Component } from 'cc';
import { SpinResultData } from '../GameData/SpinResultData';
import { GameConfig } from '../GameUtility/GameConfig';
import { SlotProcessor } from './SlotProcessor';

const { ccclass, property } = _decorator;

// 提供整台 Slot 的公開操作入口，並管理 Balance、Bet、Win 與 Round 結算
@ccclass( 'SlotGameManager' )
export class SlotGameManager extends Component
{
    // 負責單一 Round 流程的 SlotProcessor
    @property( { type: SlotProcessor } )
    public SlotProcessor: SlotProcessor | null = null;

    // 玩家目前可使用的 Balance
    private _balance: number = 0;

    // 目前每局使用的 Bet
    private _bet: number = 0;

    // 最近完成一局的 Win
    private _win: number = 0;

    // MainScene.onLoad 已完成 GameConfig 載入後，再初始化 Runtime Game Data
    protected start(): void
    {
        const gameConfig: GameConfig = GameConfig.GetInstance();
        this._balance = gameConfig.InitialBalance;
        this._bet = gameConfig.InitialBet;
    }

    // 提供目前 Balance 給 UI 顯示
    public get Balance(): number
    {
        return this._balance;
    }

    // 提供目前 Bet 給 UI 顯示
    public get Bet(): number
    {
        return this._bet;
    }

    // 提供最近完成一局的 Win 給 UI 顯示
    public get Win(): number
    {
        return this._win;
    }

    // 目前是否正在處理單一 Round
    public get IsRoundRunning(): boolean
    {
        return this.SlotProcessor?.IsRoundRunning ?? false;
    }

    // 目前 Round 是否可以要求 Skip
    public get CanSkipRound(): boolean
    {
        return this.SlotProcessor?.CanSkipRound ?? false;
    }

    // 啟動單一 Round
    public StartRound(): boolean
    {
        if ( !this.SlotProcessor || !this.SlotProcessor.CanStartRound || this._balance < this._bet )
        {
            return false;
        }

        // Round 開始時先固定本局 Bet、清除上一局 Win，並扣除下注金額
        const roundBet: number = this._bet;
        const previousWin: number = this._win;
        this._win = 0;
        this._balance -= roundBet;

        // Round 未成功啟動時還原已扣除的 Bet 與上一局 Win
        if ( !this.SlotProcessor.StartRound( roundBet, this.completeRound.bind( this ) ) )
        {
            this._balance += roundBet;
            this._win = previousWin;
            return false;
        }

        return true;
    }

    // 將玩家的 Skip 操作交給目前 Round
    public SkipRound(): boolean
    {
        if ( !this.SlotProcessor )
        {
            return false;
        }

        return this.SlotProcessor.SkipRound();
    }

    // Round 完成後依照 Spin Result 結算本局 Win 與 Balance
    private completeRound( spinResult: SpinResultData | null ): void
    {
        if ( spinResult === null )
        {
            return;
        }

        this._win = spinResult.TotalScore;
        this._balance += this._win;
    }
}
